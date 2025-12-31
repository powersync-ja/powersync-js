/**
 * Thrown when an underlying database connection is closed.
 * This is particularly relevant when worker connections are marked as closed while
 * operations are still in progress.
 */
export class ConnectionClosedError extends Error {
  static NAME = 'ConnectionClosedError';

  static MATCHES(input: any) {
    /**
     * If there are weird package issues which cause multiple versions of classes to be present, the instanceof
     * check might fail. This also performs a failsafe check.
     * This might also happen if the Error is serialized and parsed over a bridging channel like a MessagePort.
     */
    return (
      input instanceof ConnectionClosedError || (input instanceof Error && input.name == ConnectionClosedError.NAME)
    );
  }
  constructor(message: string) {
    super(message);
    this.name = ConnectionClosedError.NAME;
  }
}
