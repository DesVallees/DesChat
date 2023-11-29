const functions = require("firebase-functions")
const admin = require("firebase-admin")

admin.initializeApp()

const db = admin.firestore()

function formatPhone(phone) {
    let input = phone.replace(/\D/g, '');
    const size = input.length;
    if (input.substring(0, 1) == 1) {
        if (size === 0) { input = `` }
        else if (size < 2) { input = `+${input} ` }
        else if (size < 4) { input = `+${input.substring(0, 1)} (${input.substring(1)}` }
        else if (size < 8) { input = `+${input.substring(0, 1)} (${input.substring(1, 4)}) ${input.substring(4)}` }
        else if (size < 12) { input = `+${input.substring(0, 1)} (${input.substring(1, 4)}) ${input.substring(4, 7)}-${input.substring(7, 11)}` }
    } else {
        if (size > 7 && size < 11) { input = `(${input.substring(0, 3)}) ${input.substring(3, 6)}-${input.substring(6)}` }
        else if (size > 3 && size < 8) { input = `${input.substring(0, 3)}-${input.substring(3)}` }
    }
    return input
}

exports.sendMessage = functions.https.onCall((data, context) => {
    const from = "12015653910"
    const to = data.destination
    const text = data.text

    let params = {
        phone: formatPhone(from),
        time: new Date().toUTCString(),
        message: text,
        seen: true,
        type: 'text'
    }
    
    db.collection('messages').doc(to).get()
        .then(async (doc) => {
            if (doc.exists) {
                await db.collection('messages').doc(to).update({
                    chat: admin.firestore.FieldValue.arrayUnion(params)
                })
            } else {
                await db.collection('messages').doc(to).set({
                    chat: [params]
                })
            }
            console.log('Absolute Success While Sending Message')
        })
})

exports.receiveMessage = functions.https.onRequest(async (req, res) => {
    let params;
    if (Object.keys(req.query).length === 0) {
        params = req.body;
    } else {
        params = req.query
    }
    params = {
        phone: formatPhone(params.msisdn),
        time: new Date().toUTCString(),
        message: params.text,
        seen: false,
        type: params.type
    }
    db.collection('messages').doc(params.phone).get()
        .then(async (doc) => {
            if (doc.exists) {
                await db.collection('messages').doc(params.phone).update({
                    chat: admin.firestore.FieldValue.arrayUnion(params)
                })
            } else {
                await db.collection('messages').doc(params.phone).set({
                    profilePicture: '',
                    contactName: formatPhone(params.phone),
                    phone: formatPhone(params.phone),
                    chat: [params]
                })
            }
            res.sendStatus(200)
        })
})
