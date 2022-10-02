// ==UserScript==
// @name         Schoology Updates
// @namespace    http://emancial.me/
// @version      0.1
// @description  Restore Schoology Updates
// @author       tree tree t0rr m0uth
// @match        https://*.schoology.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=schoology.com
// @require      https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js
// @require      https://raw.githubusercontent.com/ddo/oauth-1.0a/master/oauth-1.0a.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM.xmlHttpRequest
// ==/UserScript==

class SchoologyAPI {
    constructor(key, secret) {
        this.oauth = new OAuth({
            consumer: { key, secret },
            signature_method: "HMAC-SHA1",
            hash_function: (base_string, key) => CryptoJS.HmacSHA1(base_string, key).toString(CryptoJS.enc.Base64)
        })
    }

    async request(path) {
        const url = `https://api.schoology.com/v1${path}`
        return await GM.xmlHttpRequest({
            method: "GET",
            url: url,
            headers: this.oauth.toHeader(this.oauth.authorize({ url, method: "GET" }))
        }).then(res => res.status === 200 ? JSON.parse(res.response) : null)
    }
}

(() => {
    const URL = window.location.href
    const SchoologyRegex = new RegExp(/^(?:https?:\/\/(?!api|asset-cdn|files-cdn|developer)[^\s]+\.schoology\.com.*?)$/)
    const APIRegex = new RegExp(/^(?:https?:\/\/[^\s]+\.schoology.com\/api)$/)
    const UserRegex = new RegExp(/^(?:https?:\/\/[^\s]+\.schoology.com\/user\/[0-9]+.*?)$/)
    const UpdateRegex = new RegExp(/^(?:https?:\/\/[^\s]+\.schoology.com\/user\/[0-9]+\/updates)$/)
    const key = GM_getValue("key")
    const secret = GM_getValue("secret")
    if (SchoologyRegex.test(URL)) {
        if (!key || !secret) if (!APIRegex.test(URL)) window.location.href = "/api"
        console.log("%cVerifying Login...","font-family:sans-serif; font-size: 15px")
        const client = new SchoologyAPI(key, secret)
        client.request("/app-user-info").then(res => {
            if (!res && !APIRegex.test(URL)) {
                window.location.href = "/api"
                GM_deleteValue("key")
                GM_deleteValue("secret")
            }
            else client.request("/users/" + res.api_uid).then(res => console.log(`%cSuccessful login as ${res.name_display} (UID: ${res.uid})`,"font-family:sans-serif; font-size: 15px"))
        })
        if (APIRegex.test(URL) && !key && !secret) {
            const description = document.getElementsByClassName("description warning")
            const buttons = document.getElementsByClassName("submit-span-wrapper")
            document.getElementsByClassName("page-title")[0].innerHTML = "Authorize Schoology"
            description[0].parentNode.insertBefore(description[0].cloneNode(true), description[0])
            description[0].innerHTML = "Access to your Schoology account is necessary to view Schoology updates."
            description[1].innerHTML = "Your Schoology information will always be processed client-sided and will never be sent to an external server."
            document.getElementById("main-content-wrapper").setAttribute("style", "text-align: center; display: contents;")
            document.getElementById("edit-reveal").setAttribute("value", "Authorize")
            document.getElementById("edit-current-key-wrapper").setAttribute("hidden", "true")
            document.getElementById("edit-current-secret-wrapper").setAttribute("hidden", "true")
            buttons[1].remove()
            buttons[1].remove()
            for (let i = 0; i < 10; i++) setTimeout(() => document.getElementsByClassName("g-recaptcha")[0].getElementsByTagName("div")[0].setAttribute("style", ""), i * 100)
            if (document.getElementById("edit-current-secret").value !== "********************") {
                GM_setValue("key", document.getElementById("edit-current-key").value)
                GM_setValue("secret", document.getElementById("edit-current-secret").value)
                window.location.href = "/"
            }
        }
        if (UserRegex.test(URL)) {
            const UID = URL.split("/")[4]
            try {
                const updates = document.createElement("div")
                updates.innerHTML = `<li role="menuitem" class="leaf first even"><div class="link-wrapper menu-1027 user-updates-left-menu"><a href="/user/${UID}/updates" class="menu-1027 user-updates-left-menu sExtlink-processed" role="menuitem"><span></span>Updates</a></div></li>`
                document.getElementById("menu-s-main").firstChild.prepend(updates)
            } catch(e) { console.log("Failed to load Updates leaf") }
            if (UpdateRegex.test(URL)) {
                client.request(`/users/${UID}/updates`).then(res => {
                    document.body.innerHTML = JSON.stringify(res)
                })
            }
        }
    }
})()