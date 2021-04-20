module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true
    },
    extends: [
        'ckeditor5'
    ],
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module'
    },
    rules: {
        'indent': [ 'error', 4 ]
    }
};
