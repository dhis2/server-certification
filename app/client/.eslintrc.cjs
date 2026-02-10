module.exports = {
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:import/errors',
        'plugin:import/react',
        'plugin:import/warnings',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:prettier/recommended',
    ],

    ignorePatterns: ['!.*', 'dist'],

    env: {
        browser: true,
        node: true,
        jest: true,
        es2020: true,
    },

    parser: '@typescript-eslint/parser',

    settings: {
        react: {
            version: 'detect',
        },
        'import/resolver': {
            node: {
                extensions: ['.js', '.jsx', '.ts', '.tsx'],
            },
        },
    },

    parserOptions: {
        ecmaVersion: 2018,
        ecmaFeatures: {
            jsx: true,
        },
        sourceType: 'module',
    },

    plugins: ['prefer-arrow'],

    rules: {
        'react/react-in-jsx-scope': 'off',
        'max-params': [
            'error',
            {
                max: 3,
            },
        ],
        'prefer-const': [
            'error',
            {
                destructuring: 'any',
                ignoreReadBeforeAssign: false,
            },
        ],
        'no-mixed-spaces-and-tabs': ['error'],
        'import/order': [
            'error',
            {
                'newlines-between': 'never',
                alphabetize: {
                    order: 'asc',
                    caseInsensitive: true,
                },
            },
        ],
        curly: ['error'],
        'import/extensions': ['error', 'ignorePackages', { '': 'never' }],
        'no-empty': ['error', { allowEmptyCatch: true }],
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
        'react/sort-prop-types': [
            'error',
            {
                requiredFirst: true,
                sortShapeProp: true,
                callbacksLast: true,
            },
        ],
        'react/no-unused-prop-types': 'error',

        // Arrow function rules
        'prefer-arrow/prefer-arrow-functions': [
            'error',
            {
                disallowPrototype: true,
                singleReturnOnly: false,
                classPropertiesAllowed: false,
            },
        ],
        'prefer-arrow-callback': ['error', { allowNamedFunctions: true }],
        'func-style': ['error', 'expression', { allowArrowFunctions: true }],
    },
}
