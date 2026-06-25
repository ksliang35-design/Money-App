// React 19 concurrent mode requires this global to be set for act() to work
// in non-browser test environments (jest-environment-node / react-native-env).
global.IS_REACT_ACT_ENVIRONMENT = true;
