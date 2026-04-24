export type LoginPayload = {
  email: string
  password: string
  totp_code: string
}

export type LoginResponse = {
  access_token: string
  token_type: 'Bearer'
  role: string
}
