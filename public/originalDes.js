const openChatButton = get('#openChat')
const chatOverlay = get('#chatOverlay')
const chatContainer = get('#chatContainer')
const chatMain = get('#chatMain')
const selfPP = get('#selfPP')
const selfName = get('#selfName')
const selfDescription = get('#selfDescription')
const filterChatsInput = get('#filterChatsInput')
const chatListMain = get('#chatListMain')
const profilePicture = get('profilePicture', chatMain)
const contactName = get('contactName', chatMain)
const contactDescription = get('contactDescription', chatMain)
const headerAdd = get('#headerAdd')
const chatMainBody = get('#chatMainBody')
const chatMainDisplay = get('#chatMainDisplay')
const mic = get('#mic')
const textInput = get('#textInput')
const camera = get('#camera')
const files = get('#files')
const sendInput = get('#sendInput')
const addContactOverlay = get('#addContactOverlay')
const addContactContainer = get('#addContactContainer')
const addContactCancel = get('#addContactCancel')
const addContactForm = get('#addContactForm')
const addContactPicture = get('#addContactPicture')
const addContactPictureLabel = get('#addContactPictureLabel')
const defaultPhoto = 'https://support.jfrog.com/profilephoto/72969000000Qdj1/M'

const db = firebase.firestore()

let myself
let chats = []

function setEnvironment() {
    db.collection('messages').get().then((col) => {
        let numberOfDocs = col.size;
        if(numberOfDocs <= 0){
            let newContactName = "Santiago Ovalles";
            let newContactPhone = "+1 (123) 456-7890"

            const newContactObject = {
                profilePicture: '',
                contactName: newContactName,
                phone: newContactPhone,
                chat: [],
            }
            const m = {
                phone: 'moderator',
                time: new Date().toUTCString(),
                message: `${(newContactName !== '') ? newContactName.replace(/ .*/,'') : newContactPhone} has been added to your contacts successfully.`,
                seen: false,
            }
            newContactObject.chat.push(m)
            db.collection('messages').doc(newContactPhone.replace(/\D/g,'')).set(newContactObject).then(() => {
                chats.push(newContactObject)
                currentChat = 0
    
                buildChatList()
                closeContact()
            })
        }else {
            col.forEach((doc) => {
                chats.push(doc.data())
                if (chats.length === col.docs.length) {
                    buildChatList()
                    buildMainChat()
                }
            })
        }
    })
}

db.collection('self').doc('myself').get().then((doc) => {
    myself = doc.data(); 
    setEnvironment()
})

db.collection('messages').onSnapshot((snapshot) => {
    if (chats.length > 0) {
        snapshot.docChanges().forEach((change) => {
            let contactM = change.doc.data()
            if(typeof currentChat === 'undefined'){
                currentChat = 0
            }
            for (let i = 0; i < chats.length; i++) {
                const phone = chats[i].phone;
                if (contactM.phone === phone) {
                    chats[i] = contactM
                    buildChatList()
                    return
                }
            }
            if (contactM.chat[contactM.chat.length-1].phone !== myself.phone && chats[currentChat].chat[0] == contactM.chat[0]) {
                buildMainChat()
                chatMainBody.scroll(0,0)
                let lastMessage = chatMainDisplay.lastElementChild
                lastMessage.classList.add('scaleUp')
            }
        });
    }
})


function adjustTextArea(element) {
    element.style.height = ''
    if (element.scrollHeight < chatMain.offsetHeight / 5) {
        element.style.height = element.scrollHeight + "px";
        element.style.overflowY = 'hidden'
    }else{
        element.style.overflowY = 'auto'
        element.style.height = chatMain.offsetHeight / 5 + "px";
    }
    if (element.value === '') {
        sendAvailable(false)
    }else{
        sendAvailable(true)
    }
}
let previousPhone = ''
function phoneFormat(field) {
    const specialCharCount = (field.value.match(/\D/g) || []).length;
    let cursorPosition = field.selectionStart;

    let input = field.value.replace(/\D/g,'');
    const size = input.length;
    if (input.substring(0,1) == 1) {
        if (size===0) {input=``}
        else if (size<2) {input=`+${input} `}
        else if (size<4) {input=`+${input.substring(0,1)} (${input.substring(1)}`}
        else if (size<8) {input=`+${input.substring(0,1)} (${input.substring(1,4)}) ${input.substring(4)}`}
        else if (size<12) {input=`+${input.substring(0,1)} (${input.substring(1,4)}) ${input.substring(4,7)}-${input.substring(7,11)}`}
    }else{
        if (size>7 && size<11) {input=`(${input.substring(0,3)}) ${input.substring(3,6)}-${input.substring(6)}`}
        else if (size>3 && size<8) {input=`${input.substring(0,3)}-${input.substring(3)}`}
    }
    
    if (input !== previousPhone) {
        previousPhone = input
        const specialCharDiff = (input.match(/\D/g) || []).length - specialCharCount;
        cursorPosition += specialCharDiff

        field.value = input
        field.selectionStart = cursorPosition;
        field.selectionEnd = cursorPosition;
    }
}

function isThisDate(when, date) {
    if (typeof date === 'string') {
        date = new Date(date)
    }

    const toCompare = new Date();
    if (when === 'yesterday') {
        toCompare.setDate(toCompare.getDate() - 1);
        if (toCompare.toDateString() === date.toDateString()) {
            return true;
        }
    }
    else if (when === 'today') {
        toCompare.setDate(toCompare.getDate());
        if (toCompare.toDateString() === date.toDateString()) {
            return true;
        }
    }
    return false;
}
async function sendAvailable(on) {
    let g = [mic, camera, files]
    if (on) {
        sendInput.disabled = false;    
        sendInput.style.width = '2em' 
        sendInput.style.marginInline = '.5em' 
        for (let i = 0; i < g.length; i++) {
            g[i].disabled = true;    
            g[i].style.marginInline = '0' 
            g[i].style.width = '0';
        }
    }else{
        sendInput.disabled = true;  
        sendInput.style.width = '0' 
        sendInput.style.marginInline = '0' 
        for (let i = 0; i < g.length; i++) {
            g[i].disabled = false;  
            g[i].style.marginInline = '.5em' 
            g[i].style.width = '2em';
        }
    }
}
let isChatOpen = false
async function openChat() {
    if (!isChatOpen) {
        buildMainChat(forcedChatMain)

        chatContainer.style.display = 'flex'
        await sleep(1)
        chatOverlay.style.opacity = 1
        chatOverlay.style.zIndex = 1000
        openChatButton.style.opacity = '0'
        chatContainer.style.transform = 'translateY(0) scale(1.25)'
        openChatButton.disabled = true
        await sleep(200)
        if (window.innerWidth > 1150) {
            filterChatsInput.focus()
        }else{
            textInput.focus()
        }

        document.onkeydown = function(evt) {
            evt = evt || window.event;
            if (evt.key == 'Escape') {
                closeChat()
            }
        };

        isChatOpen = true
    }
}
async function closeChat() {
    if (isChatOpen) {
        chatOverlay.style.opacity = 0
        chatOverlay.style.zIndex = -100
        openChatButton.style.opacity = '1'
        chatContainer.style.transform = 'translateY(100vh) scale(1.25)'
        openChatButton.disabled = false
        openChatButton.focus()
        await sleep(200)
        chatContainer.style.display = 'none'

        isChatOpen = false
    }
}
function openContact(adding) {
    closeChat()
    addContactContainer.style.display = 'flex'
    addContactOverlay.style.opacity = 1
    addContactOverlay.style.zIndex = 1000
    openChatButton.style.opacity = '0'
    openChatButton.disabled = true

    document.onkeydown = function(evt) {
        evt = evt || window.event;
        if (evt.key == 'Escape') {
            addContactCancel.click()
        }
    };

    if (adding) {
        addContactForm.addContactSave.innerText = 'Add Contact'
        addContactForm.onsubmit = (e) => saveContact(e, true)
        addContactForm.deleteContact.style.display = 'none'
    }else{
        if(chats[currentChat].profilePicture !== ''){
            imageURL = chats[currentChat].profilePicture
        }
        addContactForm.addContactSave.innerText = 'Save Contact'
        addContactForm['addContactName'].value = chats[currentChat].contactName
        addContactForm['addContactPhone'].value = chats[currentChat].phone
        addContactPictureLabel.style.backgroundImage = `url(${imageURL})`
        addContactForm.deleteContact.style.display = 'flex'

        addContactForm.onsubmit = (e) => saveContact(e, false)
    }
}
function closeContact() {
    addContactForm.reset()
    imageURL = defaultPhoto
    addContactPictureLabel.style.backgroundImage = `url(${imageURL})`
    addContactContainer.style.display = 'none'
    addContactOverlay.style.opacity = 0
    addContactOverlay.style.zIndex = -100
    openChat()
}

function filterChatList(value) {
    value = value.toLowerCase()
    let chatListItem = getAll('chatListItem', chatListMain)
    chatListItem.forEach(async (item) => {
        if (item.dataset.tags.includes(value)) {
            item.style.height = `${item.querySelector('.contactList').offsetHeight}px`
            item.querySelector('.contactList').disabled = false
        }else{
            if (item.style.height == '') {
                item.style.height = `${item.querySelector('.contactList').offsetHeight}px`
            }
            item.style.transition = `height .6s`
            await sleep(1)
            item.style.height = 0
            item.querySelector('.contactList').disabled = true
        }
    })
}
function buildChatList() {
    chatListMain.innerHTML = ''

    if (myself.profilePicture.length < 5) {
        myself.profilePicture = defaultPhoto
    }
    selfPP.style.backgroundImage = `url(${myself.profilePicture})`
    selfName.innerText = myself.contactName
    selfDescription.innerText = myself.description
    chats.sort(
        function(a,b){
            let aChat = a.chat
            let aDate = new Date(aChat[aChat.length - 1].time)
            let bChat = b.chat
            let bDate = new Date(bChat[bChat.length - 1].time)
            return bDate.getTime() - aDate.getTime()
        }
    );
    for (let i = 0; i < chats.length; i++) {
        const item = chats[i];
        const itemChat = item.chat

        if (itemChat.length == 0) {
            const m = {
                phone: 'moderator',
                time: new Date().toUTCString(),
                message: `${(item.contactName !== '') ? item.contactName.replace(/ .*/,'') : item.phone} has been added to your contacts successfully.`,
                seen: false,
            }
            item.chat.push(m)
        }

        let unreadMessages = 0
        for (let i = itemChat.length; i > 0; i--) {
            const m = itemChat[i-1];
            const mt = new Date(m.time)
            if (!m.seen) {
                unreadMessages++
            }
            m.hour = mt.toLocaleTimeString('default', {
                hour: '2-digit',
                minute: '2-digit',
            });
            m.date = mt.toLocaleDateString('default', {
                year: 'numeric',
                month: 'short',
                day: '2-digit'
            })
        }

        let lastMessage = itemChat[itemChat.length - 1]
        let chatItemTime;
        if (isThisDate('today', lastMessage.time)) {
            chatItemTime = lastMessage.hour
        }
        else if (isThisDate('yesterday', lastMessage.time)) {
            chatItemTime = 'Yesterday'
        }
        else{
            chatItemTime = lastMessage.date
        }

        if (item.contactName == '') {
            item.contactName = item.phone
        }

        let newMessageDisplay = 'none'
        let checkDisplay = 'none'
        if(lastMessage.phone === myself.phone){
            checkDisplay = 'flex'
        }
        else if (unreadMessages !== 0) {
            newMessageDisplay = 'flex'
        }

        if(item.profilePicture.length < 5){
            item.profilePicture = defaultPhoto
        }

        element = document.createElement('div')
        element.classList.add('chatListItem')
        element.dataset.tags = `${item.contactName.toLowerCase()} ${lastMessage.message.toLowerCase()}`
        element.innerHTML = `
            <button value="${i}" aria-label="chat with ${item.contactName}" class="contactList contactContainer" onclick="buildMainChat(this.value); textInput.focus()" onfocus="buildMainChat(this.value)">
                <div class="profilePicture" style="background-image: url(${item.profilePicture});"></div>
                <div class="contactText">
                    <div class="chatListItemLine">
                        <div class="contactName">${item.contactName}</div>
                        <div class="chatTime">${chatItemTime}</div>
                    </div>
                    <div class="chatListItemLine">
                        <div class="contactDescription">${lastMessage.message.replace('<br>', '')}</div>
                        <div class="newMessage" style="display: ${newMessageDisplay}">${unreadMessages}</div>
                        <div class="check" style="display: ${checkDisplay}"><ion-icon name="checkmark-outline"></ion-icon></div>
                    </div>
                </div>
            </button>
        `

        chatListMain.appendChild(element)
    }
}
let currentChat = ''
let currentPhone = ''
function buildMainChat(chatIndex) {
    if (typeof chatIndex === 'undefined') {
        if (currentChat === '') {
            get('contactList', chatListMain).click()
            return
        }
        chatIndex = currentChat
    }
    let item;
    if (typeof chatIndex === 'object') {
        if (chatIndex.phone === '') {
            if (currentChat === '') {
                try {
                    get('contactList', chatListMain).click()
                    return
                } catch {
                    
                }
            }
            buildMainChat(currentChat)
            return
        }else{
            for (let i = 0; i < chats.length; i++) {
                const existingChat = chats[i];
                if (existingChat.phone === chatIndex.phone) {
                    buildMainChat(i)
                    return
                }
            }
            item = chatIndex
            currentChat = ''
        }
    }else{
        currentChat = chatIndex  
        item = chats[chatIndex];    
    }

    let contactList = getAll('contactList', chatListMain)
    contactList.forEach((el) => {
        if (el.value == currentChat) {
            el.style.boxShadow = 'inset 0 0 50px 50px #00000010'
            get('newMessage', el).style.display = 'none'
        }else{
            el.style.boxShadow = ''
        }
    })

    chatMainDisplay.innerHTML = ''
    textInput.value = ''

    if(item.profilePicture.length < 5){
        item.profilePicture = defaultPhoto
    }
    if (item.contactName == '') {
        item.contactName = item.phone
    }
    let theirPhone = item.phone
    let theirPP = item.profilePicture
    let theirName = item.contactName
    let ourChat = item.chat

    currentPhone = theirPhone.replace(/\D/g,'');

    profilePicture.style.backgroundImage = `url('${theirPP}')`
    contactName.innerText = theirName
    if (theirName === theirPhone) {
        contactDescription.innerText = ''
    }else{
        contactDescription.innerText = theirPhone
    }

    if (typeof ourChat !== 'undefined') {
        let lastInterlocutor = ''
        let divisionText = '...'
        let lastTime = new Date('10/24/2022');
        for (let i = ourChat.length; i > 0; i--) {
            const m = ourChat[i-1];
            mt = new Date(m.time)
            let mDifference = Math.abs(mt - lastTime) / 60000 > 50
            let interlocutor = ''
            let accueillir = ''
            if (m.phone === 'moderator'){
                interlocutor = 'moderator'
            }
            else if (m.phone === myself.phone) {
                interlocutor = 'first'
            }else{
                interlocutor = 'second'
            }

            if (lastInterlocutor !== interlocutor || mDifference) {
                if (interlocutor !== 'moderator'){
                    accueillir = 'accueillir'
                }
                lastInterlocutor = interlocutor
            }

            if (typeof m.hour === 'undefined') {
                m.hour = mt.toLocaleTimeString('default', {
                    hour: '2-digit',
                    minute: '2-digit',
                });
                m.date = mt.toLocaleDateString('default', {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit'
                })
            }
            if (mDifference && i !== ourChat.length) {
                let division = document.createElement('div')
                division.classList.add('mainDateSeparator')
                division.innerHTML = `
                    <div class="chatHr"></div>
                    <span class="chatHrText">${divisionText}</span>
                    <div class="chatHr"></div>
                `
                chatMainDisplay.prepend(division)
            }
            lastTime = mt

            if (isThisDate('today', mt)) {
                divisionText = m.hour
            }
            else if (isThisDate('yesterday', mt)) {
                divisionText = `Yesterday ${m.hour}`
            }
            else{
                divisionText = `${m.date} at ${m.hour}`
            }

            let element = document.createElement('div')
            element.classList.add('mainMessageContainer')
            element.innerHTML = `
                <div class="mainMessage ${interlocutor} ${accueillir}">${m.message}</div>
            `
            chatMainDisplay.prepend(element)

            if (i === 1) {
                let division = document.createElement('div')
                division.classList.add('mainDateSeparator')
                division.innerHTML = `
                    <div class="chatHr"></div>
                    <span class="chatHrText">${divisionText}</span>
                    <div class="chatHr"></div>
                `
                chatMainDisplay.prepend(division)
            }

            if(!m.seen){
                m.seen = true
                db.collection('messages').doc(theirPhone.replace(/\D/g,'')).update({
                    chat: ourChat
                })
            }
        }
        
        let myPhotos = getAll('.first.accueillir', chatMainDisplay)
        
        let theirPhotos = getAll('.second.accueillir', chatMainDisplay)
        
        myPhotos.forEach((photo) => {
            photo.style.setProperty('--photo', `url('${myself.profilePicture}')`) 
        })
        theirPhotos.forEach((photo) => {
            photo.style.setProperty('--photo', `url('${item.profilePicture}')`) 
        })
    }
}
function newMessage(){
    const contact = chats[currentChat];
    messageToSubmit = textInput.value
    if (typeof contact !== 'undefined') {
        if (contact.phone.replace(/\D/g,'') === currentPhone) {
            const chat = contact.chat
            const m = {
                phone: myself.phone,
                time: new Date().toUTCString(),
                message: messageToSubmit,
                seen: true,
            }
            chat.push(m)

            buildChatList()
            buildMainChat(0)
        }
    }else{
        const m = {
            phone: myself.phone,
            time: new Date().toUTCString(),
            message: messageToSubmit,
            seen: true,
        }
        forcedChatMain.chat.push(m)
        db.collection('messages').doc(forcedChatMain.phone.replace(/\D/g,'')).set(forcedChatMain).then(() => {
            chats.push(forcedChatMain)
            
            buildChatList()
            buildMainChat(0)
        })

    }
    textInput.focus()
    chatListMain.scroll(0,0)
    chatMainBody.scroll(0,0)
    let lastMessage = chatMainDisplay.lastElementChild
    lastMessage.classList.add('scaleUp')
    
    const sendMessageFunction = firebase.functions().httpsCallable('sendMessage')
    sendMessageFunction({destination: currentPhone, text: messageToSubmit})
}
let imageURL = defaultPhoto
function saveContact(event, adding) {
    event.preventDefault()

    let newContactName = addContactForm['addContactName'].value
    let newContactPhone = addContactForm['addContactPhone'].value

    if (newContactPhone.replace(/\D/g,'').length < 7){
        fieldError(addContactForm['addContactPhone'], 'Invalid Phone Number')
        return;
    }

    if (adding) {
        const newContactObject = {
            profilePicture: imageURL,
            contactName: newContactName,
            phone: newContactPhone,
            chat: [],
        }
        const m = {
            phone: 'moderator',
            time: new Date().toUTCString(),
            message: `${(newContactName !== '') ? newContactName.replace(/ .*/,'') : newContactPhone} has been added to your contacts successfully.`,
            seen: false,
        }
        newContactObject.chat.push(m)
        db.collection('messages').doc(newContactPhone.replace(/\D/g,'')).set(newContactObject).then(() => {
            chats.push(newContactObject)
            currentChat = 0

            buildChatList()
            closeContact()
        })
    }else{
        let oldPhone = chats[currentChat].phone.replace(/\D/g,'')
        chats[currentChat].profilePicture = imageURL
        chats[currentChat].contactName = newContactName
        chats[currentChat].phone = newContactPhone
        const m = {
            phone: 'moderator',
            time: chats[currentChat].chat[chats[currentChat].chat.length - 1].time,
            message: `${(newContactName !== '') ? newContactName.replace(/ .*/,'') : newContactPhone}'s information has been updated successfully.`,
            seen: false,
        }
        chats[currentChat].chat.push(m)
        db.collection('messages').doc(newContactPhone.replace(/\D/g,'')).set(chats[currentChat]).then(()=>{
            db.collection('messages').doc(oldPhone).delete().then(() => {
                buildChatList()
                closeContact()
            })
        })
    }
}
function deleteChat() {
    db.collection('messages').doc(chats[currentChat].phone.replace(/\D/g,'')).delete().then(() => {
        chats.splice(currentChat, 1)
        currentChat = ''
        buildChatList()
        closeContact()
    })
}

addContactCancel.onclick = () => {
    closeContact()
    URL.revokeObjectURL(imageURL)
}
addContactPicture.onchange = () => {
    try {
        imageURL = URL.createObjectURL(addContactPicture.files[0])
        addContactPictureLabel.style.backgroundImage = `url(${imageURL})`
    } catch {}
}


var forcedChatMain = {
    profilePicture: '',
    contactName: '',
    phone: '',
    chat: [],
}