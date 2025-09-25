export type OperationOutcomeIssue = {
  severity: 'error' | 'warning' | 'information'
  code: string
  diagnostics?: string
  details?: {
    text: string
  }
}

export type OperationOutcome = {
  resourceType: 'OperationOutcome'
  issue: OperationOutcomeIssue[]
}

export class HttpError extends Error {
  readonly status: number
  readonly issues?: OperationOutcomeIssue[]

  constructor(status: number, message: string, issues?: OperationOutcomeIssue[]) {
    super(message)
    this.status = status
    this.issues = issues
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string) {
    super(400, message, [
      {
        severity: 'error',
        code: 'invalid',
        diagnostics: message,
      },
    ])
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string) {
    super(404, message, [
      {
        severity: 'error',
        code: 'not-found',
        diagnostics: message,
      },
    ])
  }
}

export class DataStoreError extends HttpError {
  constructor(message: string) {
    super(500, message, [
      {
        severity: 'error',
        code: 'exception',
        diagnostics: message,
      },
    ])
  }
}

export const mapErrorToOperationOutcome = (
  error: unknown,
): { status: number; body: OperationOutcome } => {
  if (error instanceof HttpError) {
    return {
      status: error.status,
      body: {
        resourceType: 'OperationOutcome',
        issue: error.issues ?? [
          {
            severity: 'error',
            code: 'exception',
            diagnostics: error.message,
          },
        ],
      },
    }
  }

  const message = error instanceof Error ? error.message : 'Unexpected error'

  return {
    status: 500,
    body: {
      resourceType: 'OperationOutcome',
      issue: [
        {
          severity: 'error',
          code: 'exception',
          diagnostics: message,
        },
      ],
    },
  }
}
