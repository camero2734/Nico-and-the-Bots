/* eslint-disable @typescript-eslint/ban-types */

export class CommandError extends Error {
    constructor(message?: string, public sendEphemeral = false) {
        super(message);
    }
}