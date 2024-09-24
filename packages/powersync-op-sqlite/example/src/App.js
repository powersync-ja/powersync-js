"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var react_native_1 = require("react-native");
var op_sqlite_1 = require("@powersync/op-sqlite");
function App() {
    var _a = (0, react_1.useState)(), result = _a[0], setResult = _a[1];
    (0, react_1.useEffect)(function () {
        (0, op_sqlite_1.multiply)(3, 7).then(setResult);
    }, []);
    return ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: styles.container, children: (0, jsx_runtime_1.jsxs)(react_native_1.Text, { children: ["Result: ", result] }) }));
}
var styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    box: {
        width: 60,
        height: 60,
        marginVertical: 20,
    },
});
