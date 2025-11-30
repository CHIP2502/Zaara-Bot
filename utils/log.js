const chalk = require('chalk');

const green = chalk.hex('#4be813'); // Xanh lá cây

module.exports = (text, type) => {
  switch (type) {
    case "warn":
      process.stderr.write(green(`[ WARN ] > ${text}`) + '\n');
      break;
    case "error":
      process.stderr.write(chalk.bold.red(`[ ERROR ] > ${text}`) + '\n');
      break;
    case "MQTT":
      process.stderr.write(green(`[ MQTT ] > ${text}`) + '\n');
      break;
    default:
      process.stderr.write(green(`${String(type).toUpperCase()} > ${text}`) + '\n');
      break;
  }
};

module.exports.loader = (data, option) => {
  switch (option) {
    case "warn":
      console.log(green(`[ WARNING ] > ${data}`));
      break;
    case "error":
      console.log(chalk.bold.red(`[ ERROR ] > ${data}`));
      break;
    default:
      console.log(green(`[ LOADING ] > ${data}`));
      break;
  }
};

module.exports.load = (data, option) => {
  let coloredData;

  switch (option) {
    case 'warn':
      coloredData = `[ LOGIN ] > ${data}`;
      console.log(green(coloredData));
      break;
    case 'error':
      coloredData = `[ ERROR ] > ${data}`;
      console.log(chalk.bold.red(coloredData));
      break;
    default:
      coloredData = `[ LOGIN ] > ${data}`;
      console.log(green(coloredData));
      break;
  }
};

module.exports.autoLogin = async (onBot, botData) => {
  onBot(botData);
};
