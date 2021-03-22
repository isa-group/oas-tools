'use strict';

const http = require('http');
const https = require('https');
const URL = require('url').URL
const config = require('../configurations')
const logger = config.logger;

/**
 * Retreives content from a url using a HTTP or HTTPS get request.
 * The function either calls a call back on sucess or just logs an exception if there are any errors.
 * @param {string} url - the url for this web request
 * @param {function} jsonHandlerCallback - the function that handles the response from the url
 */
const urlGetJson = (url, jsonHandlerCallback) => {
  if (typeof url !== 'string') {
    throw new Error('utilRequest.urlGetJson requires a url string')
  }
  if (url.toLowerCase().indexOf('https://') !== 0 && url.toLowerCase().indexOf('http://') !== 0) {
    throw new Error('utilRequest.urlGetJson requires a url starting with http:// or https://')
  }
  if (typeof jsonHandlerCallback !== 'function') {
    throw new Error('utilRequest.urlGetJson requires a jsonHandlerCallback(jsonObject) function which was not supplied.')
  }
  const u = new URL(url)
  const opt = {
    host: u.host,
    port: u.port,
    path: u.path
  }
  const htp = u.protocol === 'https:' ? https : http
  try {
    const req = htp.request(
      opt, // REQUEST OPTIONS
      (res) => {
        const chkAry = []
        res.on('error', (ex) => logger.error('urlGetJson error processing response from ' + url + ': ' + ex))
        res.on('data', (chk) => chkAry.push(chk))
        res.on('end', () => {
          const txt = chkAry.join('')
          if (res.statusCode !== 200) {
            logger.error('urlGetJson request to ' + url + ' returned an invalid response code ' + res.statusCode + '. ' + txt)
          } else {
            let jsn = null
            try {
              jsn = JSON.parse(txt)
            } catch (ex) {
              logger.debug('urlGetJson request to ' + url + ' did not return JSON. Response body was ' + txt)
            }
            logger.debug('urlGetJson request to ' + url + ' returns json object: ' + JSON.stringify(jsn))
            jsonHandlerCallback(jsn)
          }
        })
      }
    )
    logger.debug('urlGetJson sending request to ' + url)
    req.end()
  } catch (ex) {
    logger.error('urlGetJson error while attempting GET request to ' + url + ': ' + ex)
  }
}

module.exports = {
  urlGetJson: urlGetJson
};
