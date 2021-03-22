import { config } from "../configurations";

export default (options) => {
  return (req, res, next) => {
    if (options != undefined) {
      config.logger.debug(
        "<empty_middleware> Router middleware: " + options.controllers
      );
      config.controllers = options.controllers;
    } else {
      config.logger.debug("<empty_middleware> This does nothing actually.");
    }
    next();
  };
};
