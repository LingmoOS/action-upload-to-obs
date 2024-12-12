import * as core from '@actions/core'
import { OBSClient } from './obs'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const removeOldSources: boolean = core.getBooleanInput(
      'remove-old-sources',
      { required: true }
    )
    const obsUsername: string = core.getInput('obs-user-name', {
      required: true
    })
    const obsPassword: string = core.getInput('obs-password', {
      required: true
    })
    const obsProjectName: string = core.getInput('obs-project-name', {
      required: true
    })
    const obsPackageName: string = core.getInput('obs-package-name', {
      required: true
    })
    const obsInstanceUrl: string = core.getInput('obs-instance-url', {
      required: true
    })
    const localPackageDir: string = core.getInput('local-package-dir', {
      required: true
    })

    // Init OBS Client
    const obsClient = new OBSClient(obsUsername, obsPassword, obsInstanceUrl)

    // Remove old sources if requested
    if (removeOldSources) {
      await obsClient.deleteOldSourceFilesInPackage(
        obsProjectName,
        obsPackageName
      )
    }

    // Upload package
    await obsClient.uploadSourceFilesInDirToPackage(
      obsProjectName,
      obsPackageName,
      localPackageDir
    )
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
