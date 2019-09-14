module.exports = class Assert {
    constructor() {
        this.failed = [];
        this.count = 0;
    }
    base(evaluation, message) {
        this.count++;
        if (evaluation) {
            console.log(`\x1b[32m ✓ ${message.replace(/\n/g, " ")}\x1b[0m`);
            return true;
        } else {
            console.log(`\x1b[31m ✖ ${message.replace(/\n/g, " ")}\x1b[0m`);
            this.failed.push(message);
            return false;
        }
    }
    equals(a, b, message) {
        if (!message) message = `${a} should be equal to ${b}`;
        return this.base(a == b, message);
    }

    strictEquals(a, b, message) {
        if (!message) message = `${a} should be strictly equal to ${b}`;
        return this.base(a === b, message);
    }
    
    notEquals(a, b, message) {
        if (!message) message = `${a} should be not equal to ${b}`;
        return this.base(a != b, message);
    }

    notStrictEquals(a, b, message) {
        if (!message) message = `${a} should be strictly not equal to ${b}`;
        return this.base(a !== b, message);
    }

    objectHasProperty(a, b, message) {
        if (!message) message = `${a} should have property ${b}`;
        return this.base(a.hasOwnProperty(b), message);
    }

    objectHasProperties(a, b, message) {
        if (!message) message = `${a} should have properties ${b.join(",")}`;
        return this.base(b.every(t => a.hasOwnProperty(t)), message);
    }

    objectLacksProperty(a, b, message) {
        if (!message) message = `${a} should not have property ${b}`;
        return this.base(!a.hasOwnProperty(b), message);
    }

    objectLacksProperties(a, b, message) {
        if (!message) message = `${a} should not have properties ${b.join(",")}`;
        return this.base(b.every(t => !a.hasOwnProperty(t)), message);
    }

    string(a, message) {
        if (!message) message = `${a} should be a string`;
        return this.base(typeof a === "string", message);
    }

    array(a, message) {
        if (!message) message = `${a} should be an array`;
        return this.base(Array.isArray(a), message);
    }

    number(a, message) {
        if (!message) message = `${a} should be a number`;
        return this.base(typeof a === "number", message);
    }

    int(a, message) {
        if (!message) message = `${a} should be an integer`;
        return this.base(typeof a === "number" && a % 1 === 0, message);
    }

    bool(a, message) {
        if (!message) message = `${a} should be a boolean`;
        return this.base(typeof a === "boolean", message);
    }

    object(a, message) {
        if (!message) message = `${a} should be an object`;
        return this.base(typeof a === "object", message);
    }
    
    url(a, message) {
        if (!message) message = `${a} should be a valid URL`;
        //Thanks StackOverflow
        return this.base(typeof a === "string" && new RegExp("^(?:[a-z]+:)?//", "i").test(a), message);
    }

    buffer(a, message) {
        if (!message) message = `${a} should be a buffer`;
        return this.base(Buffer.isBuffer(a), message);
    }
};