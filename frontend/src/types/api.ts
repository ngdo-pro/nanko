export interface ApiValidationError {
  violations: Array<{
    propertyPath: string
    title: string
  }>
}

export interface ApiBusinessError {
  code: string
  message: string
}

export type ApiErrorResponse = ApiValidationError | ApiBusinessError

export class ApiError extends Error {
  status: number
  data?: ApiErrorResponse | unknown

  constructor(
    status: number,
    data?: ApiErrorResponse | unknown,
    message?: string,
  ) {
    super(message ?? `HTTP Error ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}
