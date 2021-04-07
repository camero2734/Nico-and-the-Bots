// eslint-disable-next-line no-undef
module.exports = function (plop) {
    // controller generator

    plop.setGenerator("component", {
        description: "application component logic",

        prompts: [
            {
                type: "input",
                name: "name",
                message: "component name please"
            }
        ],
        actions: [
            {
                type: "add",
                path: "../src/commands/{{name}}.ts",
                templateFile: "templates/index.ts.hbs"
            }
        ]
    });
};
