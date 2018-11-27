module.exports = {
    "env": {
        "es6": true,
        "browser": true,
        "node": true,
        "mocha": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    "rules": {
        "strict": 0,

        "no-console": [
            "error"
        ],
        "indent": [
            "off",
            4
        ],
        "quotes": [
            "off",
            "single"
        ],
        "semi": [
            "warn"
        ]
    }
}