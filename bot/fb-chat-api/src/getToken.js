"use strict";

var utils = require("../utils");
var log = require("npmlog");

module.exports = function(defaultFuncs, api, ctx) {
    return function getToken(callback) {
        var resolveFunc = function() {};
        var rejectFunc = function() {};
        var returnPromise = new Promise(function(resolve, reject) {
            resolveFunc = resolve;
            rejectFunc = reject;
        });

        if (!callback) {
            callback = function(err, token) {
                if (err) return rejectFunc(err);
                resolveFunc(token);
            };
        }

        // Generate UUID function
        function generateUUID() {
            return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0,
                    v = c === "x" ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        const form = {
            doc_id: "6494107973937368",
            variables: JSON.stringify({
                input: {
                    client_mutation_id: "4",
                    actor_id: ctx.userID,
                    config_enum: "GDP_CONFIRM",
                    device_id: null,
                    experience_id: generateUUID(),
                    extra_params_json: JSON.stringify({
                        app_id: "350685531728",
                        kid_directed_site: "false",
                        logger_id: generateUUID(),
                        next: "confirm",
                        redirect_uri: "https://www.facebook.com/connect/login_success.html",
                        response_type: "token",
                        return_scopes: "false",
                        scope: '["user_subscriptions","user_videos","user_website","user_work_history","friends_about_me","friends_actions.books","friends_actions.music","friends_actions.news","friends_actions.video","friends_activities","friends_birthday","friends_education_history","friends_events","friends_games_activity","friends_groups","friends_hometown","friends_interests","friends_likes","friends_location","friends_notes","friends_photos","friends_questions","friends_relationship_details","friends_relationships","friends_religion_politics","friends_status","friends_subscriptions","friends_videos","friends_website","friends_work_history","ads_management","create_event","create_note","export_stream","friends_online_presence","manage_friendlists","manage_notifications","manage_pages","photo_upload","publish_stream","read_friendlists","read_insights","read_mailbox","read_page_mailboxes","read_requests","read_stream","rsvp_event","share_item","sms","status_update","user_online_presence","video_upload","xmpp_login"]',
                        steps: "{}",
                        tp: "unspecified",
                        cui_gk: "[PASS]:\"\"",
                        is_limited_login_shim: "false"
                    }),
                    flow_name: "GDP",
                    flow_step_type: "STANDALONE",
                    outcome: "APPROVED",
                    source: "gdp_delegated",
                    surface: "FACEBOOK_COMET"
                }
            }),
            fb_dtsg: ctx.fb_dtsg,
            server_timestamps: true
        };

        defaultFuncs
            .post("https://www.facebook.com/api/graphql/", ctx.jar, form)
            .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
            .then(function(res) {
                console.log(res);
                if (!res || !res.data || !res.data.run_post_flow_action || !res.data.run_post_flow_action.uri) {
                    throw new Error("Invalid response (0)");
                }

                const uri = res.data.run_post_flow_action.uri;
                const params = new URLSearchParams(uri.split("?")[1] || "");

                if (!params.has("close_uri")) {
                    throw new Error("Invalid response (2)");
                }

                const closeUri = decodeURIComponent(params.get("close_uri"));
                if (!closeUri.includes("#access_token=")) {
                    throw new Error("Invalid response (3)");
                }

                const tokenParams = new URLSearchParams(closeUri.split("#")[1]);
                const accessToken = tokenParams.get("access_token");

                if (!accessToken) {
                    throw new Error("Invalid response (4)");
                }

                ctx.access_token = accessToken;
                return callback(null, accessToken);
            })
            .catch(function(err) {
                log.error("getExtendedAccessToken", err);
                return callback(err);
            });

        return returnPromise;
    };
};