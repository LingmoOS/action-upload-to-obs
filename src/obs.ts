import * as httpm from '@actions/http-client'
import * as jsdom from 'jsdom'

/**
 * A class to interact with the OBS WebSocket API
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class OBSClient {
  constructor(
    readonly id: string,
    readonly password: string,
    readonly server_url: string
  ) {
    this._authCode = this.getAuthCode(id, password)
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

  protected getHttpClient(auth_code: string): httpm.HttpClient {
    const http = new httpm.HttpClient('http-client-obs-actions', [], {
      headers: {
        Accept: 'application/xml',
        Authorization: `Basic ${auth_code}`
      }
    })
    return http
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
      const http: httpm.HttpClient = this.getHttpClient(this._authCode)
      const res: httpm.HttpClientResponse = await http.get(
        `https://api.opensuse.org/source/${project_name}/${package_name}`
      )
      const body: string = await res.readBody()

      // Only need to check the status code
      if (res.message.statusCode !== 200) {
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
    close_commit: boolean = true
  ): Promise<boolean> {
    try {
      const rev: string = close_commit ? 'commit' : 'upload'
      const commit_string: string = `Delete ${file_name}`
      const http: httpm.HttpClient = this.getHttpClient(this._authCode)
      const res: httpm.HttpClientResponse = await http.del(
        `https://api.opensuse.org/source/${project_name}/${package_name}/${file_name}?rev=${rev}&meta=0&keeplink=1&comment=${commit_string}`
      )
      const body: string = await res.readBody()

      // Nothing to do with the response body
      // Only need to check the status code
      if (res.message.statusCode === 200) {
        return true
      } else {
        throw new Error(body)
      }
    } catch (error) {
      console.log(error)
      return false
    }
  }

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
          file.indexOf('dsc') !== -1 ||
          file.indexOf('changes') !== -1 ||
          file.indexOf('tar') !== -1
        ) {
          const is_last_file: boolean = (file === files_list[files_list.length - 1])
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

  private _authCode: string
}
