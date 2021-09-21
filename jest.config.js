module.exports = {
  "maxWorkers": 4,
  "verbose": true,
  "rootDir": "/Users/johncollier/development/projects/bootstraps/packages/common/react-redux-common-modules/src/api",
  "testEnvironment": "jsdom",
  "testURL": "http://localhost",
  "testRegex": ".*\\.test\\.(js|tsx?)$",
  "globals": {},
  "testPathIgnorePatterns": [
    "/node_modules/",
    "/dist/"
  ],
  "moduleFileExtensions": [
    "js",
    "ts",
    "tsx",
    "json"
  ],
  "moduleDirectories": [
    "node_modules"
  ],
  "collectCoverageFrom": [
    "src/**/*.{js,jsx,ts,tsx}"
  ],
  "watchPathIgnorePatterns": [
    "dist",
    "target"
  ],
  "moduleNameMapper": {
    "\\.(css|less|sass|scss)$": "/Users/johncollier/development/projects/bootstraps/packages/common/build-tools/dist/src/__mocks__/style-mock.js"
  },
  "modulePathIgnorePatterns": [
    "/node_modules/",
    "/dist/"
  ],
  "transform": {
    "^.+\\.js$": "/tmp/build-tools/react-redux-common-modules/MTE3MjYy/jest-transform.js",
    "^.+\\.tsx?$": "/Users/johncollier/development/projects/bootstraps/node_modules/ts-jest/dist/index.js"
  },
  "transformIgnorePatterns": [
    "/node_modules/(?!@github1).+$",
    ".*react-githubish.*",
    ".*react-portal.*"
  ],
  "setupFiles": [
    "/Users/johncollier/development/projects/bootstraps/packages/common/build-tools/dist/src/jest-helpers.js"
  ]
}