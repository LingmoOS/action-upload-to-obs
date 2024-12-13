import * as jsdom from 'jsdom'
import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'

/**
 * A class to interact with the OBS WebSocket API
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class OBSClient {
  constructor(
    readonly id: string,
    readonly password: string,
    readonly server_url: string
  ) {
    this._authCode = this.getAuthCode(id, password)
    this._serverUrl = server_url
  }

  /**
   * 生成授权码
   *
   * @async
   * @function getAuthCode
   * @param {string} id - 用户ID
   * @param {string} pass - 用户密码
   * @returns {string} - 返回Base64编码的授权码
   */
  protected getAuthCode(id: string, pass: string): string {
    const auth = `${id}:${pass}`
    const buf = Buffer.from(auth, 'ascii')
    return buf.toString('base64')
  }

  /**
   * 获取指定项目中指定包中的文件列表。
   *
   * @param {string} project_name - 项目名称。
   * @param {string} package_name - 包名称。
   * @returns {Promise<string[] | null>} - 包含文件名的字符串数组。
   *
   * @protected
   * @async
   */
  protected async getFilesListInPackage(
    project_name: string,
    package_name: string
  ): Promise<string[] | null> {
    try {
      const service = axios.create({
        headers: {
          Accept: 'application/xml',
          Authorization: `Basic ${this._authCode}`
        }
      })
      const response = await service.get(
        `${this._serverUrl}/source/${project_name}/${package_name}`,
        {
          headers: {
            Accept: 'application/xml',
            Authorization: `Basic ${this._authCode}`
          }
        }
      )
      const body: string = response.data as string

      // Only need to check the status code
      if (response.status !== 200) {
        throw new Error(body)
      }

      // Analyze the XML response to extract the list of files
      const xml_res: jsdom.JSDOM = new jsdom.JSDOM(body, {
        contentType: 'application/xml'
      })
      const xml_document: Document = xml_res.window.document

      const files_entry: HTMLCollectionOf<Element> = xml_document
        .getElementsByTagName('directory')[0]
        .getElementsByTagName('entry')
      const files_list: string[] = []

      for (let i = 0; i < files_entry.length; i++) {
        const files_entry_name: string | null =
          files_entry[i].getAttribute('name')
        if (files_entry_name != null) {
          files_list.push(files_entry_name)
        } else {
          console.log('Error: Failed to get file name')
        }
      }

      return files_list
    } catch (error) {
      console.log(error)
      return null
    }
  }

  /**
   *  删除指定项目中指定包中的文件。
   * @param project_name 项目名称
   * @param package_name 包名称
   * @param file_name 待删除的文件名
   * @param close_commit 是否结束提交
   *
   * @returns {Promise<boolean>} 删除操作是否成功
   *
   * @protected
   * @async
   */
  protected async deleteOneFileInPackage(
    project_name: string,
    package_name: string,
    file_name: string,
    close_commit = true
  ): Promise<boolean> {
    try {
      const rev = close_commit ? 'cmd=commit' : 'rev=upload'
      const commit_string = `Delete ${file_name}`
      const service = axios.create({
        headers: {
          Accept: 'application/xml',
          Authorization: `Basic ${this._authCode}`
        }
      })
      const response = await service.delete(
        `${this._serverUrl}/source/${project_name}/${package_name}/${file_name}?${rev}&meta=0&keeplink=0&comment=${commit_string}`
      )

      const body: string = response.data as string

      // Nothing to do with the response body
      // Only need to check the status code
      if (response.status === 200) {
        return true
      } else {
        throw new Error(body)
      }
    } catch (error) {
      console.log(error)
      return false
    }
  }

  protected async uploadOneFileToPackage(
    project_name: string,
    package_name: string,
    file_src: string,
    close_commit = true
  ): Promise<boolean> {
    try {
      // Import mime
      const mime = (await import('mime')).default

      const rev = close_commit ? 'cmd=commit' : 'rev=upload'
      const commit_string = `Upload Sources`
      const data = fs.readFileSync(file_src)
      const file_name = path.basename(file_src)
      let file_mimetype = mime.getType(file_name)
      if (file_mimetype === null) {
        file_mimetype = 'text/plain'
      }
      const service = axios.create({
        headers: {
          Accept: 'application/xml',
          Authorization: `Basic ${this._authCode}`,
          'Content-Type': file_mimetype
        }
      })
      const result = await service.put(
        `${this._serverUrl}/source/${project_name}/${package_name}/${file_name}?${rev}&meta=0&keeplink=0&comment=${commit_string}`,
        data
      )

      const body: string = result.data as string

      // Nothing to do with the response body
      // Only need to check the status code
      if (result.status !== 200) {
        throw new Error(body)
      }

      return true
    } catch (error) {
      console.log(error)
      return false
    }
  }

  /**
   * 从指定目录中获取debian源文件列表
   * @param dir 希望查找源文件的目录
   * @returns {string[] | null} 源文件列表
   */
  protected getLocalFileListInDir(dir: string): string[] | null {
    try {
      // Get realpath of the dir
      const real_path: string = fs.realpathSync(dir)

      // Get all files in the dir
      const files_list: string[] = []
      const all_files = fs.readdirSync(real_path)

      // files object contains all files names
      // log them on console
      for (const file of all_files) {
        if (
          file.includes('dsc') ||
          file.includes('changes') ||
          file.includes('tar')
        ) {
          files_list.push(`${real_path}/${file}`)
        }
      }

      return files_list
    } catch (error) {
      console.log(error)
      return null
    }
  }

  /*********************
   * 以下为外部调用接口*
   *********************/

  /**
   * 删除指定项目中指定包中的旧文件。
   *
   * @param {string} project_name - 项目名称。
   * @param {string} package_name - 包名称。
   * @returns {Promise<boolean>} - 删除操作是否成功。
   *
   * @async
   */
  async deleteOldSourceFilesInPackage(
    project_name: string,
    package_name: string
  ): Promise<boolean> {
    try {
      console.log('Deleting old files.')
      // Get all files in the package
      const files_list: string[] | null = await this.getFilesListInPackage(
        project_name,
        package_name
      )

      if (files_list === null) {
        throw new Error(
          `Error: Failed to get files list in package ${package_name}`
        )
      }

      // Delete old files in the package
      for (const file of files_list) {
        if (
          file.includes('dsc') ||
          file.includes('changes') ||
          file.includes('tar')
        ) {
          const is_last_file: boolean =
            file === files_list[files_list.length - 1]
          const res: boolean = await this.deleteOneFileInPackage(
            project_name,
            package_name,
            file,
            is_last_file
          )

          if (!res) {
            throw new Error(
              `Error: Failed to delete file ${file} in package ${package_name}`
            )
          }
        }
      }

      return true
    } catch (error) {
      console.log(error)
      return false
    }
  }

  /**
   * 上传指定目录中的源文件到指定项目中指定包中。
   * @param project_name 项目名称
   * @param package_name 包名称
   * @returns {Promise<boolean>} 上传操作是否成功
   */
  async uploadSourceFilesInDirToPackage(
    project_name: string,
    package_name: string,
    local_dir: string
  ): Promise<boolean> {
    try {
      console.log('Uploading new files.')
      // Get all files in the package
      const files_list: string[] | null = this.getLocalFileListInDir(local_dir)

      if (files_list === null) {
        throw new Error(
          `Error: Failed to get files list in package ${package_name}`
        )
      }

      // Upload files in the package
      for (const file of files_list) {
        const is_last_file: boolean = file === files_list[files_list.length - 1]
        const res: boolean = await this.uploadOneFileToPackage(
          project_name,
          package_name,
          file,
          is_last_file
        )

        if (!res) {
          throw new Error(
            `Error: Failed to upload file ${file} in package ${package_name}`
          )
        }
      }

      return true
    } catch (error) {
      console.log(error)
      return false
    }
  }

  private _authCode: string
  private _serverUrl: string
}
