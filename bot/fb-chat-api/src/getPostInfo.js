"use strict";

var utils = require("../utils");
var log = require("npmlog");
var bluebird = require("bluebird");

module.exports = function(defaultFuncs, api, ctx) {
  function getPostData(postID, callback) {
    var form = {
        av: ctx.userID,
        fb_api_caller_class: "RelayModern",
        fb_api_req_friendly_name: "CometPostDetailsQuery",
        doc_id: "5914945681905635",
        variables: JSON.stringify({
            "feedLocation": "PERMALINK",
            "feedbackSource": 2,
            "postID": postID,
            "scale": 1,
            "useDefaultActor": false
        }),
        server_timestamps: true
    };

    defaultFuncs
      .post("https://www.facebook.com/api/graphql/", ctx.jar, form)
      .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
      .then(function(resData) {
        if (resData.error) throw resData;
        
        // Parse data từ response
        const postInfo = JSON.parse(resData.body);
        if (!postInfo.data?.node) throw {error: "Post not found or no permission"};

        const post = postInfo.data.node;
        return {
            id: post.id,
            text: post.comet_sections?.content?.story?.message?.text || "",
            creation_time: post.creation_time,
            author: {
                id: post.author?.id,
                name: post.author?.name,
                url: post.author?.url
            },
            reactions: {
                count: post.feedback?.reaction_count?.count || 0
            },
            comments: {
                count: post.feedback?.comment_count?.total_count || 0
            },
            shares: {
                count: post.feedback?.share_count?.count || 0
            }
        };
      })
      .then(resData => callback(null, resData))
      .catch(function(err) {
        log.error("getPostData", err);
        return callback(err);
      });
  }

  return function getPostInfo(postID, callback) {
    if (!callback) {
      var resolveFunc = function(){};
      var rejectFunc = function(){};
      var returnPromise = new Promise(function(resolve, reject) {
        resolveFunc = resolve;
        rejectFunc = reject;
      });

      callback = function(err, data) {
        if (err) return rejectFunc(err);
        resolveFunc(data);
      };
    }

    try {
      getPostData(postID, callback);
    } catch (err) {
      log.error("getPostInfo", err);
      callback(err);
    }

    return returnPromise;
  };
};