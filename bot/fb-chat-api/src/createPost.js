"use strict";

var utils = require("../utils");
var log = require("npmlog");
var fs = require('fs');
var axios = require('axios');
var FormData = require('form-data');
var path = require('path');
var got = require('got');

module.exports = function (defaultFuncs, api, ctx) {
  return function createPost(options, callback) {
    var resolveFunc = function () { };
    var rejectFunc = function () { };
    var returnPromise = new Promise(function (resolve, reject) {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (!callback) {
      callback = function (err, postInfo) {
        if (err) return rejectFunc(err);
        resolveFunc(postInfo);
      };
    }
    if (!options) options = {};
    if (!options.caption && !options.videoUrl && !options.imageUrl) {
      return callback({ error: "createPost: Cần cung cấp caption, videoUrl hoặc imageUrl." });
    }

    const accessToken = global.config.ACCESSTOKEN;
    if (!accessToken) {
      return callback({ error: "createPost: Không tìm thấy access token trong global.config.ACCESSTOKEN" });
    }

    const privacy = options.privacy || "EVERYONE";
    const tags = options.tags || [];
    
    let endpoint;
    if (options.videoUrl) {
      if (options.targetType === "reels") {
        endpoint = "me/reels";
      } else if (options.targetType === "group" && options.groupId) {
        endpoint = `${options.groupId}/videos`;
      } else {
        endpoint = "me/videos";
      }
    } else if (options.imageUrl) {
      if (options.targetType === "group" && options.groupId) {
        endpoint = `${options.groupId}/photos`;
      } else {
        endpoint = "me/photos";
      }
    } else {
      if (options.targetType === "group" && options.groupId) {
        endpoint = `${options.groupId}/feed`;
      } else {
        endpoint = "me/feed";
      }
    }
    async function uploadVideo(videoUrl) {
      const tempFile = path.join(__dirname, `temp_video_${Date.now()}.mp4`);
      
      try {
        await new Promise((resolve, reject) => {
          const stream = got.stream(videoUrl).pipe(fs.createWriteStream(tempFile));
          stream.on('finish', resolve);
          stream.on('error', reject);
        });
        const postUrl = `https://graph-video.facebook.com/v19.0/${endpoint}`;
        const form = new FormData();
        form.append('file', fs.createReadStream(tempFile));
        form.append('description', options.caption || '');
        form.append('access_token', accessToken);
        form.append('privacy', JSON.stringify({ value: privacy }));
        if (tags.length > 0) form.append('tags', tags.join(','));

        const res = await axios.post(postUrl, form, {
          headers: form.getHeaders()
        });
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        
        return {
          id: res.data.id,
          url: `https://facebook.com/${res.data.id}`
        };
      } catch (err) {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        throw err;
      }
    }
    async function uploadText() {
      try {
        const textUrl = `https://graph.facebook.com/v19.0/${endpoint}`;
        const params = {
          message: options.caption,
          access_token: accessToken,
          privacy: JSON.stringify({ value: privacy })
        };
        
        if (tags.length > 0) params.tags = tags.join(',');
        
        const res = await axios.post(textUrl, params);
        
        return {
          id: res.data.id,
          url: `https://facebook.com/${res.data.id}`
        };
      } catch (err) {
        throw err;
      }
    }
    async function uploadImage(imageUrl) {
      const tempFile = path.join(__dirname, `temp_image_${Date.now()}.jpg`);
      
      try {
        await new Promise((resolve, reject) => {
          const stream = got.stream(imageUrl).pipe(fs.createWriteStream(tempFile));
          stream.on('finish', resolve);
          stream.on('error', reject);
        });
        const imagePostUrl = `https://graph.facebook.com/v19.0/${endpoint}`;
        const form = new FormData();
        form.append('source', fs.createReadStream(tempFile));
        form.append('message', options.caption || '');
        form.append('access_token', accessToken);
        form.append('privacy', JSON.stringify({ value: privacy }));
        if (tags.length > 0) form.append('tags', tags.join(','));

        const res = await axios.post(imagePostUrl, form, {
          headers: form.getHeaders()
        });
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        
        return {
          id: res.data.id,
          url: `https://facebook.com/${res.data.id}`
        };
      } catch (err) {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        throw err;
      }
    }
    (async () => {
      try {
        let result;
        
        if (options.videoUrl) {
          result = await uploadVideo(options.videoUrl);
        } else if (options.imageUrl) {
          result = await uploadImage(options.imageUrl);
        } else {
          result = await uploadText();
        }
        
        return callback(null, result);
      } catch (err) {
        log.error("createPost", err);
        return callback(err.response?.data || err);
      }
    })();

    return returnPromise;
  };
};