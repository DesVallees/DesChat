function get(query = '', container = document) {
    let attribute = query.substring(0, 1)
    let queryName = query.substring(1)
    if (attribute !== '#' && attribute !== '.') {
        attribute = '.'
        queryName = query
    }
    return container.querySelector(`${attribute}${queryName}`)
}

function getAll(query = '', container = document) {
    let attribute = query.substring(0, 1)
    let queryName = query.substring(1)
    if (attribute !== '#' && attribute !== '.') {
        attribute = '.'
        queryName = query
    }
    return container.querySelectorAll(`${attribute}${queryName}`)
}

async function repeatClass(cl, item) {
    item.classList.remove(cl)
    await sleep(0.00001);
    item.classList.add(cl)
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function disappear(element) {
    element.style.display = 'none'
}

function appear(element) {
    element.style.display = 'flex'
}

async function fieldError(field, message) {
    repeatClass('hovering', field)
    let realPlaceholder = field.placeholder
    field.value = ''
    field.placeholder = message
    await sleep(3000)
    field.placeholder = realPlaceholder
}

let openChatButton
let chatOverlay
let chatContainer
let chatMain
let selfPP
let selfName
let selfDescription
let filterChatsInput
let chatListMain
let profilePicture
let contactName
let contactDescription
let headerAdd
let chatMainBody
let chatMainDisplay
let mic
let textInput
let fileDisplay
let fileDisplayContainer
let camera
let cameraLabel
let files
let filesLabel
let sendInput
let addContactOverlay
let addContactContainer
let addContactCancel
let addContactForm
let addContactPicture
let addContactPictureLabel
let predeterminedMessagesContainer
let defaultPhoto = 'https://support.jfrog.com/profilephoto/72969000000Qdj1/M'
let imageURL = defaultPhoto
let fileObject = {}
let fileURL = ''

const db = firebase.firestore()

let myself
let chats = []

function setEnvironment() {
    openChatButton = get('#openChat')
    chatOverlay = get('#chatOverlay')
    chatContainer = get('#chatContainer')
    chatMain = get('#chatMain')
    selfPP = get('#selfPP')
    selfName = get('#selfName')
    selfDescription = get('#selfDescription')
    filterChatsInput = get('#filterChatsInput')
    chatListMain = get('#chatListMain')
    profilePicture = get('profilePicture', chatMain)
    contactName = get('contactName', chatMain)
    contactDescription = get('contactDescription', chatMain)
    headerAdd = get('#headerAdd')
    chatMainBody = get('#chatMainBody')
    chatMainDisplay = get('#chatMainDisplay')
    mic = get('#mic')
    textInput = get('#textInput')
    fileDisplay = get('#fileDisplay')
    fileDisplayContainer = get('#fileDisplayContainer')
    camera = get('#camera')
    cameraLabel = get('#cameraLabel')
    files = get('#files')
    filesLabel = get('#filesLabel')
    sendInput = get('#sendInput')
    addContactOverlay = get('#addContactOverlay')
    addContactContainer = get('#addContactContainer')
    addContactCancel = get('#addContactCancel')
    addContactForm = get('#addContactForm')
    addContactPicture = get('#addContactPicture')
    addContactPictureLabel = get('#addContactPictureLabel')
    predeterminedMessagesContainer = get('predeterminedMessagesContainer')

    openChatButton.style.opacity = '1'
    openChatButton.style.zIndex = '1'
    openChatButton.disabled = false

    addContactCancel.onclick = () => {
        closeContact()
        URL.revokeObjectURL(imageURL)
    }
    addContactPicture.onchange = () => {
        try {
            imageURL = URL.createObjectURL(addContactPicture.files[0])
            addContactPictureLabel.style.backgroundImage = `url(${imageURL})`
        } catch { }
    }

    camera.onchange = () => {
        try {
            fileObject = camera.files[0]
            sendAvailable()
            sendingFile()
        } catch (error) { console.log(error.message) }
    }
    files.onchange = () => {
        try {
            fileObject = files.files[0]
            sendAvailable()
            sendingFile()
        } catch (error) { console.log(error.message) }
    }

    for (let i = 0; i < predeterminedMessages.length; i++) {
        const element = predeterminedMessages[i];

        let option = document.createElement('button')
        option.classList.add('predeterminedMessage')
        option.innerHTML = element.name
        option.onclick = () => {
            textInput.value = fixPredeterminedMessage(element.message)
            adjustTextArea(textInput)
            textInput.focus()
            textInput.scrollTop = textInput.scrollHeight
        }

        predeterminedMessagesContainer.appendChild(option)
    }

    
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
    myself.profilePicture ||= defaultPhoto
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
    } else {
        element.style.overflowY = 'auto'
        element.style.height = chatMain.offsetHeight / 5 + "px";
    }
    if (element.value === '') {
        sendAvailable(false)
    } else {
        sendAvailable(true)
    }
}
function getFormattedPhone(phone) {
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
let previousPhone = ''
function phoneFormat(field) {
    const specialCharCount = (field.value.match(/\D/g) || []).length;
    let cursorPosition = field.selectionStart;

    let input = getFormattedPhone(field.value)

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
function sendAvailable(on = true) {
    let dynamic = []
    let nonDynamic = []
    if (currentPhone.includes('internal:')) {
        dynamic = [cameraLabel, filesLabel]
        nonDynamic = [mic]
    } else {
        dynamic = [mic]
        nonDynamic = [cameraLabel, filesLabel]
    }
    for (let i = 0; i < nonDynamic.length; i++) {
        nonDynamic[i].disabled = true;
        nonDynamic[i].style.marginInline = '0'
        nonDynamic[i].style.width = '0';
        nonDynamic[i].tabIndex = '-1';
    }
    if (on) {
        sendInput.disabled = false;
        sendInput.style.width = '2em'
        sendInput.style.marginInline = '.5em'
        for (let i = 0; i < dynamic.length; i++) {
            dynamic[i].disabled = true;
            dynamic[i].style.marginInline = '0'
            dynamic[i].style.width = '0';
            dynamic[i].tabIndex = '-1';
        }
    } else {
        sendInput.disabled = true;
        sendInput.style.width = '0'
        sendInput.style.marginInline = '0'
        for (let i = 0; i < dynamic.length; i++) {
            dynamic[i].disabled = false;
            dynamic[i].style.marginInline = ''
            dynamic[i].style.width = '';
            dynamic[i].tabIndex = '0';
        }
    }
}
function sendingFile(on = true) {
    if (on) {
        fileURL = URL.createObjectURL(fileObject)

        textInput.disabled = true;
        textInput.style.display = 'none'

        fileDisplay.disabled = false;
        fileDisplayContainer.style.display = 'flex'
        if (fileObject.type.includes('image')) {
            fileDisplay.style.backgroundImage = `url(${fileURL})`
        } else {
            fileDisplay.innerHTML = `
                <div class="mainLink" style="background-color: rgb(55, 108, 243); color: white;">
                    <a tabindex="-1"><ion-icon name="document-outline"></ion-icon><span>${fileObject.name}</span></a>
                </div>
            `
        }
    } else {
        fileURL = ''
        fileObject = {}
        URL.revokeObjectURL(fileURL)
        files.value = ''
        camera.value = ''
        sendAvailable(false)

        fileDisplay.disabled = true;
        fileDisplayContainer.style.display = 'none'
        fileDisplay.style.backgroundImage = `none`
        fileDisplay.innerHTML = ``

        textInput.disabled = false;
        textInput.style.display = 'flex'
    }
    fileDisplay.href = fileURL
}

let isChatOpen = false
async function openChat() {

    try {
        buildChatList()

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
            } else {
                textInput.focus()
            }

            document.onkeydown = function (evt) {
                evt = evt || window.event;
                if (evt.key == 'Escape') {
                    closeChat()
                }
            };

            isChatOpen = true
        }

    } catch (error) {
        console.error(error);

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

    document.onkeydown = function (evt) {
        evt = evt || window.event;
        if (evt.key == 'Escape') {
            addContactCancel.click()
        }
    };

    if (adding) {
        addContactForm.addContactSave.innerText = 'Add Contact'
        addContactForm.onsubmit = (e) => saveContact(e, true)
        addContactForm.deleteContact.style.display = 'none'
    } else {
        if (chats[currentChat].profilePicture !== '') {
            imageURL = chats[currentChat].profilePicture
        }
        addContactForm.addContactSave.innerText = 'Save Contact'
        addContactForm['addContactName'].value = chats[currentChat].contactName
        addContactForm['addContactPhone'].value = (chats[currentChat].phone.includes('internal:')) ? chats[currentChat].phone : getFormattedPhone(chats[currentChat].phone)
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
async function togglePredetermined(on = true) {
    if (on && predeterminedMessagesContainer.style.display == 'none') {
        predeterminedMessagesContainer.style.display = 'flex'
        predeterminedMessagesContainer.style.opacity = '1'
        get('predeterminedMessage', predeterminedMessagesContainer).focus()
        await sleep(1)
        document.onclick = () => { togglePredetermined(false) }
    } else {
        predeterminedMessagesContainer.style.opacity = ''
        await sleep(200)
        predeterminedMessagesContainer.style.display = 'none'
        document.onclick = () => { }
    }
}

function filterChatList(value) {
    value = value.toLowerCase()
    let chatListItem = getAll('chatListItem', chatListMain)
    chatListItem.forEach(async (item) => {
        if (item.dataset.tags.includes(value)) {
            item.style.height = `${item.querySelector('.contactList').offsetHeight}px`
            item.querySelector('.contactList').disabled = false
        } else {
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

    if (typeof chatListMain != 'undefined') {
        chatListMain.innerHTML = ''
    }

    selfPP.style.backgroundImage = `url(${myself.profilePicture})`
    selfName.innerText = myself.contactName
    selfDescription.innerText = myself.description
    chats.sort(
        function (a, b) {
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

        let unreadMessages = 0
        for (let i = itemChat.length; i > 0; i--) {
            const m = itemChat[i - 1];
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

        let lastMessage = itemChat.at(-1)
        let chatItemTime;
        if (isThisDate('today', lastMessage.time)) {
            chatItemTime = lastMessage.hour
        }
        else if (isThisDate('yesterday', lastMessage.time)) {
            chatItemTime = 'Yesterday'
        }
        else {
            chatItemTime = lastMessage.date
        }

        item.contactName ||= item.phone
        item.profilePicture ||= defaultPhoto


        let newMessageDisplay = 'none'
        let checkDisplay = 'none'
        if (lastMessage.phone === myself.phone) {
            checkDisplay = 'flex'
        }
        else if (unreadMessages !== 0) {
            newMessageDisplay = 'flex'
        }



        element = document.createElement('div')
        element.classList.add('chatListItem')
        element.dataset.tags = `${item.contactName.toLowerCase()} ${lastMessage.message.toLowerCase()}`
        element.innerHTML = `
            <button value="${i}" style="${(i == currentChat) ? 'box-shadow: inset 0 0 50px 50px #00000010' : ''}" aria-label="chat with ${item.contactName}" class="contactList contactContainer" onclick="buildMainChat(this.value); textInput.focus()" onfocus="buildMainChat(this.value)">
                <div class="profilePicture" style="background-image: url(${item.profilePicture});"></div>
                <div class="contactText">
                    <div class="chatListItemLine">
                        <div class="contactName">${item.contactName}</div>
                        <div class="chatTime">${chatItemTime}</div>
                    </div>
                    <div class="chatListItemLine">
                        <div class="contactDescription">${(lastMessage.type === 'text') ? lastMessage.message.replace('<br>', '') : lastMessage.message.split('::')[0]}</div>
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

function fileToString(file) {
    return new Promise((resolve, reject) => {
        if (!window.FileReader) {
            alert('Your browser does not support this feature');
            reject();
        };

        var reader = new FileReader();

        reader.onload = function (evt) {
            if (evt.target.readyState != 2) return;
            if (evt.target.error) {
                alert('Error while reading file');
                reject();
            }

            resolve(evt.target.result)
        };

        reader.readAsDataURL(file);
    })
}
function base64toBlob(base64Data, contentType) {
    contentType ||= '';
    var sliceSize = 1024;
    var byteCharacters = atob(base64Data.split(',')[1]);
    var bytesLength = byteCharacters.length;
    var slicesCount = Math.ceil(bytesLength / sliceSize);
    var byteArrays = new Array(slicesCount);

    for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
        var begin = sliceIndex * sliceSize;
        var end = Math.min(begin + sliceSize, bytesLength);

        var bytes = new Array(end - begin);
        for (var offset = begin, i = 0; offset < end; ++i, ++offset) {
            bytes[i] = byteCharacters[offset].charCodeAt(0);
        }
        byteArrays[sliceIndex] = new Uint8Array(bytes);
    }
    return new Blob(byteArrays, { type: contentType });
}

async function newMessage(){
    const contact = chats[currentChat];
    let type = 'text'
    let messageToSubmit = ''
    if (fileURL) {
        type = fileObject.type
        messageToSubmit = `${fileObject.name}::${await fileToString(fileObject)}`

        sendingFile(false)
    } else {
        messageToSubmit = textInput.value
    }

    currentChat = 0
    if (typeof contact !== 'undefined') {
        if (contact.phone.replace(/\D/g, '') === currentPhone.replace(/\D/g, '')) {
            const chat = contact.chat
            const m = {
                phone: myself.phone,
                time: new Date().toUTCString(),
                message: messageToSubmit,
                seen: true,
                type: type
            }
            chat.push(m)

            buildChatList()
            buildMainChat()
        }
    } else {
        const m = {
            phone: myself.phone,
            time: new Date().toUTCString(),
            message: messageToSubmit,
            seen: true,
            type: type
        }
        forcedChatMain.chat.push(m)
        chats.push(forcedChatMain)

        buildChatList()
        buildMainChat()
    }
    textInput.focus()
    chatListMain.scroll(0, 0)
    chatMainBody.scroll(0, 0)
    let lastMessage = chatMainDisplay.lastElementChild
    lastMessage.classList.add('scaleUp')
    
    const sendMessageFunction = firebase.functions().httpsCallable('sendMessage')
    sendMessageFunction({destination: currentPhone, text: messageToSubmit})
}
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


function fixPredeterminedMessage(message) {
    const clientName = chats[currentChat].contactName.split(' ')
    const myName = myself.contactName.split(' ')
    const predeterminedKeys = {
        '--clientFirstName': clientName[0],
        '--clientMiddleName': (clientName[1] && clientName[2]) ? clientName[1] : 'undefined',
        '--clientLastName': (clientName[1] && clientName[2]) ? clientName[2] : ((clientName[1]) ? clientName[1] : 'undefined'),
        '--clientFullName': chats[currentChat].contactName,
        '--myFirstName': myName[0],
        '--myMiddleName': (myName[1] && myName[2]) ? myName[1] : 'undefined',
        '--myLastName': (myName[1] && myName[2]) ? myName[2] : ((myName[1]) ? myName[1] : 'undefined'),
        '--myFullName': myself.contactName,
        '--myDescription': myself.description
    }

    for (const key in predeterminedKeys) {
        message = message.replaceAll(key, predeterminedKeys[key])
    }

    return message
}

var forcedChatMain = {
    profilePicture: '',
    contactName: '',
    phone: '',
    chat: [],
}
const predeterminedMessages = [
    {
        name: 'Default Message 1',
        message: 'Hello --clientFirstName, this is --myFullName contacting you because the...'
    },
    {
        name: 'Default Message 2',
        message: 'Looks like you have won the christmas contest...'
    },
    {
        name: 'Default Message 3',
        message: `Dashing through the snow\nOn a one horse open sleigh\nO'er the fields we go,\nLaughing all the way\nBells on bob tail ring,\nmaking spirits bright\nWhat fun it is to laugh and sing\nA sleighing song tonight`
    },
    {
        name: 'Default Message 4',
        message: 'What do you get when you cross a snowman with a vampire? Frostbite.'
    },
    {
        name: 'Default Message 5',
        message: 'What is it called when a snowman has a temper tantrum? A meltdown.'
    },
    {
        name: 'Default Message 6',
        message: `Hello Mr./Ms. --clientFirstName, or should we call you Mr./Ms. --clientLastName. Our records show that your middle name is --clientMiddleName. 
            \nThis is a --myDescription lawyer whose last name is --myLastName and whose first name is --myFirstName contacting you to say that our full names are: \n--clientFullName \n--myFullName`
    },
]