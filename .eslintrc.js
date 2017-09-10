module.exports = {
roo: 'ru',

    parserOptions: {
        ecmaVersion: 6,
        sourceType: 'module',
    },

    extends: 'eslint:recommended',
    env: {
        node: true,
    },
    rules: {
        'indent': ['error', 4, { SwitchCase: 1 }],
        'quotes': ['error', 'single', { "allowTemplateLiterals": true }],
        'semi': ['error', 'never'],
        'comma-dangle': ['error', {
            arrays: 'always-multiline',
            objects: 'always-multiline',
            imports: 'always-multiline',
            exports: 'always-multiline',
            functions: 'never',
        }]
    }
}
