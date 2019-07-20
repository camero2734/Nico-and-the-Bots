//Find command from name or alias
module.exports = function(commandName, commands) {
    for (let command of commands) {
        //If the command has multiple names check them all
        if (command.aliases && Array.isArray(command.aliases)) {
            for (let alias of command.aliases) {
                if (alias === commandName) return command;
            }
            //Otherwise just check the command name- duh
        } else if (commandName === command.name) return command;
    }
    return false;
}