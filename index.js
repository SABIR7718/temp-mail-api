/*
 * © 2026 SeXyxeon (VOIDSEC)
 *
 * ⚠️ COPYRIGHT NOTICE
 * This source code is protected under copyright law.
 * Any form of re-uploading, recoding, modification,
 * selling, or redistribution WITHOUT explicit permission
 * from the original author is strictly prohibited.
 *
 * ❌ NO CREDIT = NO PERMISSION
 * ❌ DO NOT CLAIM THIS CODE AS YOUR OWN
 *
 * ✔️ Usage or modification is allowed ONLY
 * with prior permission and proper credit.
 *
 * OFFICIAL LINKS (ONLY):
 * YouTube   : https://youtube.com/@voidsec7718
 * Instagram : sabir._7718
 * Telegram  : https://t.me/SABIR7718
 * GitHub    : https://github.com/SABIR7718
 * WhatsApp  : +91 73650 85213
 *
 * Violations may result in DMCA takedown
 * or termination of the Telegram bot.
 */


require("dotenv").config();
const express = require("express");
const {
    google
} = require("googleapis");
const {
    log
} = require("@sabir7718/log");
const crypto = require("crypto");
const http = require("http");
const WebSocket = require("ws");

const S7HaTeSY = express();

const server =
    http.createServer(S7HaTeSY);

const wss =
    new WebSocket.Server({
        server
    });

const S7Clients =
    new Map();

const S7LastMessages =
    new Map();

const auth =
    new google.auth.OAuth2(

        process.env.GMAIL_CLIENT_ID,

        process.env.GMAIL_CLIENT_SECRET,

        process.env.GMAIL_REDIRECT_URI

    );

auth.setCredentials({

    access_token: process.env.GMAIL_ACCESS_TOKEN,

    refresh_token: process.env.GMAIL_REFRESH_TOKEN,

    scope: "https://www.googleapis.com/auth/gmail.modify",

    token_type: "Bearer"

});

const gmail = google.gmail({
    version: "v1",
    auth
});

const S7Firebase =
    process.env.FIREBASE_URL;

async function S7SaveInbox(data) {

    try {

        await fetch(

            `${S7Firebase}/${data.id}.json`,

            {

                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(data)

            }

        );

        return true;

    } catch (err) {

        log(
            'error',
            'FIREBASE',
            err.message
        );

        return false;

    }

}

async function S7GetInbox(id) {

    try {

        const response =
            await fetch(
                `${S7Firebase}/${id}.json`
            );

        return await response.json();

    } catch (err) {

        log(
            'error',
            'FIREBASE',
            err.message
        );

        return null;

    }

}

function S7GenerateInbox() {

    const chars =
        "abcdefghijklmnopqrstuvwxyz";

    const charLength =
        crypto.randomInt(5, 8);

    const numLength =
        crypto.randomInt(4, 7);

    let text = "";

    for (
        let i = 0; i < charLength; i++
    ) {

        text +=
            chars[
                crypto.randomInt(
                    0,
                    chars.length
                )
            ];

    }

    let numbers = "";

    for (
        let i = 0; i < numLength; i++
    ) {

        numbers +=
            crypto.randomInt(0, 10);

    }

    return `${text}${numbers}`;

}

async function S7DeleteInbox(id) {

    try {

        await fetch(

            `${S7Firebase}/${id}.json`,

            {
                method: "DELETE"
            }

        );

        return true;

    } catch (err) {

        log(
            'error',
            'FIREBASE',
            err.message
        );

        return false;

    }

}

function S7Decode(payload) {

    let body = "";

    if (payload.body?.data) {

        body = Buffer
            .from(
                payload.body.data
                .replace(/-/g, "+")
                .replace(/_/g, "/"),
                "base64"
            )
            .toString();

    }

    if (payload.parts) {

        for (const part of payload.parts) {

            if (
                part.mimeType === "text/plain" &&
                part.body?.data
            ) {

                body += Buffer
                    .from(
                        part.body.data
                        .replace(/-/g, "+")
                        .replace(/_/g, "/"),
                        "base64"
                    )
                    .toString();

            }

            if (
                part.mimeType === "text/html" &&
                part.body?.data &&
                !body
            ) {

                body += Buffer
                    .from(
                        part.body.data
                        .replace(/-/g, "+")
                        .replace(/_/g, "/"),
                        "base64"
                    )
                    .toString();

            }

            if (part.parts) {

                body += S7Decode(part);

            }

        }

    }

    return body;

}

async function S7CheckInboxRealtime(id) {

    try {

        const inbox =
            await S7GetInbox(id);

        if (!inbox)
            return;

        const target =
            inbox.email
            .toLowerCase()
            .trim();

        const response =
            await gmail.users.messages.list({

                userId: "me",
                maxResults: 10

            });

        const mails = [];

        const oldMessages =
            S7LastMessages.get(id) || [];

        for (const msg of response.data.messages || []) {

            const full =
                await gmail.users.messages.get({

                    userId: "me",
                    id: msg.id

                });

            const headers =
                full.data.payload.headers || [];

            const recipientHeaders = [

                "to",
                "x-forwarded-for",
                "delivered-to",
                "x-original-to"

            ];

            let matched = false;

            for (const key of recipientHeaders) {

                const value =
                    headers.find(x =>
                        x.name.toLowerCase() === key
                    )?.value || "";

                if (
                    value
                    .toLowerCase()
                    .includes(target)
                ) {

                    matched = true;
                    break;

                }

            }

            if (!matched)
                continue;

            const body =
                S7Decode(
                    full.data.payload
                );

            const rawFrom =

                headers.find(x =>
                    x.name.toLowerCase() === "reply-to"
                )?.value ||

                headers.find(x =>
                    x.name.toLowerCase() === "from"
                )?.value ||

                null;

            let from = rawFrom;

            if (rawFrom) {

                const emailMatch =
                    rawFrom.match(
                        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
                    );

                if (emailMatch) {

                    from = emailMatch[1];

                }

            }

            const subject =
                headers.find(x =>
                    x.name.toLowerCase() === "subject"
                )?.value || null;

            const date =
                headers.find(x =>
                    x.name.toLowerCase() === "date"
                )?.value || null;

            const otpPatterns = [

                /verification code is (\d{4,8})/i,
                /otp[:\s]+(\d{4,8})/i,
                /code[:\s]+(\d{4,8})/i,
                /\b(\d{4,8})\b/

            ];

            let otp = null;

            for (const pattern of otpPatterns) {

                const match =
                    body.match(pattern);

                if (match) {

                    otp = match[1];
                    break;

                }

            }

            mails.push({

                id: msg.id,

                to: target,

                from,

                subject,

                date,

                otp,

                body

            });

        }

        const newMessages =
            mails.filter(mail =>
                !oldMessages.some(
                    old =>
                    old.id === mail.id
                )
            );

        if (
            newMessages.length === 0
        ) {

            return;

        }

        S7LastMessages.set(
            id,
            mails
        );

        const ws =
            S7Clients.get(id);

        if (
            ws &&
            ws.readyState === WebSocket.OPEN
        ) {

            ws.send(
                JSON.stringify({

                    success: true,

                    type: "inbox",

                    id,

                    email: target,

                    total: newMessages.length,

                    mails: newMessages,

                    mails,

                    developer: "SABIR7718"

                })
            );

        }

    } catch (err) {

        log(
            'error',
            'WS',
            err.message
        );

    }

}

wss.on("connection", ws => {

    log(
        'info',
        'WS',
        'Client connected'
    );

    ws.on("message", async message => {

        try {

            const data =
                JSON.parse(message);

            if (
                data.action === "new"
            ) {

                const inbox =
                    S7GenerateInbox();

                const email =
                    `${inbox}@syxs7.us.cc`;

                const id =
                    "S7_" +
                    crypto
                    .randomBytes(16)
                    .toString("hex");

                const created =
                    Date.now();

                const expires =
                    created +
                    (3 * 24 * 60 * 60 * 1000);

                await S7SaveInbox({

                    id,

                    email,

                    created,

                    expires,

                    developer: "SABIR7718"

                });

                S7Clients.set(
                    id,
                    ws
                );

                ws.send(
                    JSON.stringify({

                        success: true,

                        type: "new",

                        id,

                        email,

                        created,

                        expires,

                        developer: "SABIR7718"

                    })
                );

            }

            if (
                data.action === "listen" &&
                data.id
            ) {

                S7Clients.set(
                    data.id,
                    ws
                );

                ws.send(
                    JSON.stringify({

                        success: true,

                        type: "connected",

                        id: data.id

                    })
                );

            }

        } catch (err) {

            ws.send(
                JSON.stringify({

                    success: false,
                    error: err.message

                })
            );

        }

    });

    ws.on("close", () => {

        for (
            const [id, client] of S7Clients.entries()
        ) {

            if (client === ws) {

                S7Clients.delete(id);

            }

        }

        log(
            'info',
            'WS',
            'Client disconnected'
        );

    });

});

setInterval(async () => {

    for (
        const [id] of S7Clients.entries()
    ) {

        await S7CheckInboxRealtime(id);

    }

}, 5000);

S7HaTeSY.get("/", async (req, res) => {

    res.json({

        success: true,

        message: "TEMP MAIL API",

        developer: "SABIR7718",

        endpoints: {

            new_inbox: "/new",

            check_inbox: "/inbox/:id",

            help: "/help"

        }

    });

});

S7HaTeSY.get("/help", async (req, res) => {

    res.json({

        success: true,

        developer: "SABIR7718",

        message: "TEMP MAIL API DOCUMENTATION",

        steps: [

            {

                step: 1,

                title: "Create Inbox",

                endpoint: "/new",

                method: "GET",

                example: "/new"

            },

            {

                step: 2,

                title: "Check Inbox",

                endpoint: "/inbox/:id",

                method: "GET",

                example: "/inbox/S7_xxxxxxxxx"

            },

            {

                step: 3,

                title: "Inbox Validity",

                validity: "3 days"

            }

        ],

        response_example: {

            success: true,

            id: "S7_abc123xyz",

            email: "random@syxs7.us.cc",

            expires_in: "3 days"

        }

    });

});

S7HaTeSY.get("/new", async (req, res) => {

    try {

        const inbox =
            S7GenerateInbox();

        const email =
            `${inbox}@syxs7.us.cc`;

        const id =
            "S7_" +
            crypto
            .randomBytes(16)
            .toString("hex");

        const created =
            Date.now();

        const expires =
            created +
            (3 * 24 * 60 * 60 * 1000);

        await S7SaveInbox({

            id,

            email,

            created,

            expires,

            developer: "SABIR7718"

        });

        log(
            'success',
            'TEMP-MAIL',
            `Generated inbox: ${email}`
        );

        res.json({

            success: true,

            id,

            email,

            created,

            expires,

            expires_in: "3 days",

            developer: "SABIR7718"

        });

    } catch (err) {

        log(
            'error',
            'TEMP-MAIL',
            err.message
        );

        res.status(500).json({

            success: false,
            error: err.message

        });

    }

});

S7HaTeSY.get("/inbox/:id", async (req, res) => {

    try {

        const id =
            req.params.id;

        const inbox =
            await S7GetInbox(id);

        if (!inbox) {

            return res.status(404).json({

                success: false,
                error: "INVALID ID"

            });

        }

        if (
            Date.now() >
            inbox.expires
        ) {

            await S7DeleteInbox(id);

            return res.status(410).json({

                success: false,
                error: "INBOX EXPIRED"

            });

        }

        const target =
            inbox.email
            .toLowerCase()
            .trim();

        log(
            'success',
            'TEMP-MAIL',
            `Checking inbox: ${target}`
        );

        const response =
            await gmail.users.messages.list({

                userId: "me",
                maxResults: 50

            });

        const mails = [];

        for (const msg of response.data.messages || []) {

            const full =
                await gmail.users.messages.get({

                    userId: "me",
                    id: msg.id

                });

            const headers =
                full.data.payload.headers || [];

            const recipientHeaders = [

                "to",
                "x-forwarded-for",
                "delivered-to",
                "x-original-to"

            ];

            let recipient = "";

            for (const key of recipientHeaders) {

                const value =
                    headers.find(x =>
                        x.name.toLowerCase() === key
                    )?.value || "";

                if (
                    value
                    .toLowerCase()
                    .includes(target)
                ) {

                    recipient = value;
                    break;

                }

            }

            if (!recipient)
                continue;

            const body =
                S7Decode(
                    full.data.payload
                );

            const rawFrom =

                headers.find(x =>
                    x.name.toLowerCase() === "reply-to"
                )?.value ||

                headers.find(x =>
                    x.name.toLowerCase() === "from"
                )?.value ||

                null;

            let from = rawFrom;

            if (rawFrom) {

                const emailMatch =
                    rawFrom.match(
                        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
                    );

                if (emailMatch) {

                    from = emailMatch[1];

                }

            }

            const subject =
                headers.find(x =>
                    x.name.toLowerCase() === "subject"
                )?.value || null;

            const date =
                headers.find(x =>
                    x.name.toLowerCase() === "date"
                )?.value || null;

            const otpPatterns = [

                /verification code is (\d{4,8})/i,
                /otp[:\s]+(\d{4,8})/i,
                /code[:\s]+(\d{4,8})/i

            ];

            let otp = null;

            for (const pattern of otpPatterns) {

                const match =
                    body.match(pattern);

                if (match) {

                    otp = match[1];
                    break;

                }

            }

            mails.push({

                id: msg.id,

                to: target,

                from,

                subject,

                date,

                otp,

                body

            });

        }

        log(

            'info',
            'TEMP-MAIL',
            `${mails.length} mails found for ${target}`

        );

        res.json({

            success: true,

            id,

            email: target,

            total: mails.length,

            expires: inbox.expires,

            mails,

            developer: "SABIR7718"

        });

    } catch (err) {

        log(

            'error',
            'TEMP-MAIL',
            err.message

        );

        res.status(500).json({

            success: false,
            error: err.message

        });

    }

});

server.listen(process.env.PORT || 3000, () => {

    log(
        'success',
        'SYSTEM',
        `TEMP MAIL API + WS ${process.env.PORT || 3000}`
    );

});

if (process.env.URL) {

    (async () => {
        try {
            const res = await fetch(process.env.URL);
            log('info', 'PING', `Pinged: ${process.env.URL} | Status: ${res.status}`);
        } catch (err) {
            log('error', 'PING', err.message);
        }
    })();

    setInterval(async () => {
        try {
            const res = await fetch(process.env.URL);
            log('info', 'PING', `Pinged: ${process.env.URL} | Status: ${res.status}`);
        } catch (err) {
            log('error', 'PING', err.message);
        }
    }, 5 * 60 * 1000);
}