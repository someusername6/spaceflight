/**
 * Mission File Updater - AST-based file manipulation for mission rewards.
 *
 * Uses ts-morph for robust TypeScript AST manipulation to update
 * mission reward values and sort missions by reward.
 */

import path from 'node:path';
import { Project, SyntaxKind } from 'ts-morph';

// Mission file paths by sector and difficulty
export const MISSION_FILES = {
  1: {
    easy: 'src/ui/screens/missions/sector1/easy.ts',
    medium: 'src/ui/screens/missions/sector1/medium.ts',
    hard: 'src/ui/screens/missions/sector1/hard.ts',
  },
  2: {
    easy: 'src/ui/screens/missions/sector2/easy.ts',
    medium: 'src/ui/screens/missions/sector2/medium.ts',
    hard: 'src/ui/screens/missions/sector2/hard.ts',
  },
  3: {
    easy: 'src/ui/screens/missions/sector3/easy.ts',
    medium: 'src/ui/screens/missions/sector3/medium.ts',
    hard: 'src/ui/screens/missions/sector3/hard.ts',
  },
  4: {
    easy: 'src/ui/screens/missions/sector4/easy.ts',
    medium: 'src/ui/screens/missions/sector4/medium.ts',
    hard: 'src/ui/screens/missions/sector4/hard.ts',
  },
  5: {
    easy: 'src/ui/screens/missions/sector5/easy.ts',
    medium: 'src/ui/screens/missions/sector5/medium.ts',
    hard: 'src/ui/screens/missions/sector5/hard.ts',
  },
};

/**
 * Create a ts-morph project for file manipulation.
 */
export function createProject() {
  return new Project({
    tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
    skipAddingFilesFromTsConfig: true,
  });
}

/**
 * Update mission rewards and sort by reward using AST manipulation.
 *
 * @param {Project} project - ts-morph project instance
 * @param {string} filePath - relative path to the mission file
 * @param {Record<string, number>} rewardMap - mission id -> new reward value
 * @returns {boolean} true if successful
 */
export function updateMissionFile(project, filePath, rewardMap) {
  const fullPath = path.resolve(process.cwd(), filePath);
  const sourceFile = project.addSourceFileAtPath(fullPath);

  // Find the exported array variable
  const arrayDecl = sourceFile
    .getVariableDeclarations()
    .find((v) => v.getName().includes('SECTOR_'));

  if (!arrayDecl) {
    console.error(`  Could not find SECTOR_ array in ${filePath}`);
    return false;
  }

  const arrayLiteral = arrayDecl.getInitializerIfKind(
    SyntaxKind.ArrayLiteralExpression,
  );

  if (!arrayLiteral) {
    console.error(`  Could not find array literal in ${filePath}`);
    return false;
  }

  // Get all mission objects with their data
  const missionElements = arrayLiteral.getElements();
  const missions = [];

  for (const element of missionElements) {
    if (element.getKind() !== SyntaxKind.ObjectLiteralExpression) continue;

    const obj = element.asKind(SyntaxKind.ObjectLiteralExpression);
    const idProp = obj.getProperty('id');
    const rewardProp = obj.getProperty('reward');

    if (!idProp || !rewardProp) continue;

    const idInit = idProp
      .asKind(SyntaxKind.PropertyAssignment)
      ?.getInitializer();
    const id = idInit?.getText().replace(/['"]/g, '');

    if (!id) continue;

    // Get new reward from map, or keep existing
    const newReward = rewardMap[id];

    if (newReward !== undefined) {
      // Update the reward value
      const rewardAssign = rewardProp.asKind(SyntaxKind.PropertyAssignment);
      if (rewardAssign) {
        rewardAssign.setInitializer(newReward.toString());
      }
    }

    // Get the current reward value for sorting
    const currentReward =
      newReward ??
      parseInt(
        rewardProp
          .asKind(SyntaxKind.PropertyAssignment)
          ?.getInitializer()
          ?.getText() ?? '0',
        10,
      );

    missions.push({
      element: obj,
      id,
      reward: currentReward,
      text: obj.getFullText(),
    });
  }

  // Sort missions by reward (ascending)
  missions.sort((a, b) => a.reward - b.reward);

  // Rebuild the array with sorted elements
  const sortedTexts = missions.map((m) => m.element.getText());

  // Clear and rebuild
  while (arrayLiteral.getElements().length > 0) {
    arrayLiteral.removeElement(0);
  }

  for (const text of sortedTexts) {
    arrayLiteral.addElement(text);
  }

  return true;
}

/**
 * Get the file path for a mission based on sector and difficulty.
 */
export function getMissionFilePath(sector, difficulty) {
  return MISSION_FILES[sector]?.[difficulty];
}
