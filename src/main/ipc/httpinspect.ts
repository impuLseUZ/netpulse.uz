/**
 * IPC-домен 'httpinspect': произвольный HTTP-запрос + разбор ответа.
 */
import { CHANNELS } from '@shared/channels'
import { HttpRequestQuery, HttpResponseResult } from '@shared/httpinspect-types'
import { sendHttpRequest } from '../services/httpinspect'
import { handle } from './handle'

export function registerHttpInspectIpc(): void {
  handle<HttpResponseResult>(CHANNELS.httpinspect.send, (arg) =>
    sendHttpRequest(arg as HttpRequestQuery)
  )
}
