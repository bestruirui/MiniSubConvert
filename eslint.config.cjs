const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
    {
        ignores: [
            "dist/**",
            "node_modules/**",
            ".wrangler/**",
            "src/core/proxy-utils/parsers/peggy/*.js"
        ]
    },
    js.configs.recommended,
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.node,
                ...globals.browser,
                ...(globals.serviceworker || {})
            }
        },
        rules: {
            "no-empty": ["error", { allowEmptyCatch: false }],
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }]
        }
    }
];
