/* eslint-disable @typescript-eslint/ban-types */

import { nanoid } from "nanoid";

export class CommandError extends Error {
    constructor(message?: string, public sendEphemeral = false) {
        super(message);
    }
}

export const NULL_CUSTOM_ID_PREFIX = "__null__";
export const NULL_CUSTOM_ID = () => `${NULL_CUSTOM_ID_PREFIX}${nanoid()}`;
