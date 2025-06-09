export const ALREADY_REGISTERED_SINGLE = 'AlreadyRegisteredError'

export class AlreadyRegisteredError extends Error {
    code: string
  
    constructor(message = "You are already registered for this webinar.") {
      super(message)
      this.name = ALREADY_REGISTERED_SINGLE
      this.code = 'already_registered_single'
      Object.setPrototypeOf(this, AlreadyRegisteredError.prototype)
    }
  }