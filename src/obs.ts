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
   * @returns {Promise<string[]>} - 包含文件名的字符串数组。
   *
   * @protected
   * @async
   */
  protected async getFilesListInPackage(
    project_name: string,
    package_name: string
  ): Promise<string[]> {
    const http: httpm.HttpClient = this.getHttpClient(this._authCode)
    const res: httpm.HttpClientResponse = await http.get(
      `https://api.opensuse.org/source/${project_name}/${package_name}`
    )
    const body: string = await res.readBody()

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
  }

  private _authCode: string
}
