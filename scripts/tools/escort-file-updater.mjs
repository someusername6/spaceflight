/**
 * Escort Mission File Updater
 *
 * Uses ts-morph to update escort mission reward values in source files.
 * Used by update-escort-rewards.mjs.
 */

import path from 'node:path';
import { Project, SyntaxKind } from 'ts-morph';

/**
 * Create a ts-morph Project instance
 */
export function createProject() {
  return new Project({
    tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
    skipAddingFilesFromTsConfig: true,
  });
}

/**
 * Update escort mission rewards in a TypeScript file
 *
 * @param {Project} project - ts-morph project
 * @param {string} filePath - Path to the file
 * @param {Record<string, number>} rewardMap - Map of mission ID to new reward
 * @returns {boolean} Success
 */
export function updateEscortFile(project, filePath, rewardMap) {
  const fullPath = path.resolve(process.cwd(), filePath);
  const sourceFile = project.addSourceFileAtPath(fullPath);

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

    const newReward = rewardMap[id];

    if (newReward !== undefined) {
      const rewardAssign = rewardProp.asKind(SyntaxKind.PropertyAssignment);
      if (rewardAssign) {
        rewardAssign.setInitializer(newReward.toString());
      }
    }

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

  const sortedTexts = missions.map((m) => m.element.getText());

  while (arrayLiteral.getElements().length > 0) {
    arrayLiteral.removeElement(0);
  }

  for (const text of sortedTexts) {
    arrayLiteral.addElement(text);
  }

  return true;
}
