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
        "ecmaFeatures": {
            // "experimentalObjectRestSpread": true,
            // "jsx": true
        },
        "sourceType": "module"
    },
    "plugins": [
        // "react"
        // "babel"
    ],
    // "parser": "babel-eslint",
    "rules": {
        "strict": 0,
        // "babel/new-cap": 1,
        // "babel/no-invalid-this": 1,
        // "babel/object-curly-spacing": 1,
        // "babel/quotes": 1,
        // "babel/semi": 1,
        // "babel/no-unused-expressions": 1,

        "no-console": [
            "error"
        ],
        "indent": [
            "off",
            4
        ],
        // "linebreak-style": [
        //     "error",
        //     "windows"
        // ],
        "quotes": [
            "off",
            "single"
        ],
        "semi": [
            //"off",
            "warn"
        ]
    }
}