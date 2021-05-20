const IMAGE_TYPE = "image";
const VIDEO_TYPE = "video";
const TEXT_TYPE  = "text";

var storage;
var usedContentIDs = [];

var hideHeaderInterval;

var imagesToLoad = 0;
var imagesLoaded = 0;

function imageLoadedCallback() {
    imagesLoaded++;
}

function getUniqueId(id) {
    var ind = 0;
    while (usedContentIDs.indexOf(id + "_" + ind) > -1) ind++;
    usedContentIDs.push(id + "_" + ind);
    return id + "_" + ind;
}

function insertSource(imgID,url) {
    document.getElementById(imgID).src = url;
    document.getElementById(imgID).onload = imageLoadedCallback;
}

function createVideoContent(content) {
    var vidElement = document.createElement("video");
    vidElement.muted = true;
    vidElement.autoplay = true;
    vidElement.loop = true;
    vidElement.controls = false;

    var curID = getUniqueId(content.split(".")[0]);
    vidElement.id = curID;

    var vidRef = storage.ref("videos/" + content);
    vidRef.getDownloadURL().then(insertSource.bind(null,curID));

    return vidElement;
}

function createImageContent(content) {
    var imgElement = document.createElement("img");

    var curID = getUniqueId(content.split(".")[0]);
    imgElement.id = curID;

    var imgRef = storage.ref("images/" + content);
    imagesToLoad++;
    imgRef.getDownloadURL().then(insertSource.bind(null,curID));

    return imgElement;
}

function createTextContent(content) {
    var textElement = document.createElement("p");
    textElement.innerHTML = content;

    var curID = getUniqueId(content.split(".")[0]);
    textElement.id = curID;

    return textElement;
}

function createColumn(data) {
    var colElement = document.createElement("div");
    colElement.classList.add("col");
    colElement.style.flexGrow = data.size;

    switch (data.type) {
        case TEXT_TYPE:
            colElement.appendChild(createTextContent(data.content));
            break;
        case VIDEO_TYPE:
            colElement.appendChild(createVideoContent(data.content));
            break;
        case IMAGE_TYPE:
            colElement.appendChild(createImageContent(data.content));
            break;
        default:
            console.log("Error: column data type is invalid");
            return null;
    }

    return colElement;
}

function createRow(rowNum, data) {
    var rowElement = document.createElement("section");
    rowElement.classList.add("row");
    rowElement.id = "row_" + rowNum;

    for (var i = 0; i < data.columns.length; i++) {
        rowElement.appendChild(createColumn(data.columns[i]));
    }

    return rowElement
}

var headerElement;
var scrollElement;

var maxScroll = window.innerHeight*3.5;
var lastScroll = 0;

function checkScrollAmt() {
    var scrollAmt = scrollElement.scrollTop / maxScroll;
    if (scrollAmt > 0.8) headerElement.classList.add("hidden");
    else if (lastScroll != scrollAmt) {
        headerElement.classList.remove("hidden");
        camera.position.x = param_vars.camera_pos_x - (100 * scrollAmt);
        camera.position.y = (param_vars.camera_pos_y - (100 * scrollAmt)) * Math.pow(0.5 + (window.innerHeight/window.innerWidth),1);
        camera.position.z = (param_vars.camera_pos_z + (200 * scrollAmt)) * Math.pow(0.5 + (window.innerHeight/window.innerWidth),1);

        camera.lookAt(new THREE.Vector3(
            param_vars.camera_lookat_x,
            param_vars.camera_lookat_y,
            param_vars.camera_lookat_z
        ));

        waterUniforms.gradientStart.value = param_vars.gradient_start + scrollAmt;
    }
    lastScroll = scrollAmt;
}

function resizeInfoHandler() {
    document.getElementById("infoText").style.marginTop =
        (parseFloat(siteSettings.global_font_size.replace(/px/g,"")) - 2 +
         parseFloat(siteSettings.about_text_offset.replace(/px/g,""))) + "px";
}

function toggleInfoPage() {

    var infoContElement = document.getElementById("infoCont");
    var infoButton = document.getElementById("infoButton");
    if (infoContElement.classList.contains("hidden")) { // then open about
        infoContElement.classList.remove("hidden");
        infoButton.innerHTML = "BACK";
        headerElement.classList.add("inverted");
    }
    else {
        infoContElement.classList.add("hidden");
        infoButton.innerHTML = "INFO";
        headerElement.classList.remove("inverted");
    }
}

function insertInfoImg(id,url) {
    var container = document.getElementById("infoImage");
    var imgEl = document.createElement("img");
    imgEl.onload = imageLoadedCallback;
    imgEl.src = url;
    imgEl.id = "infoImg_" + id;
    imgEl.classList.add("hidden");
    container.appendChild(imgEl);
}

function showTextHoverHandler(ev) {
    var imgInd = ev.target.id.split("_")[1];
    var container = document.getElementById("infoImage");
    container.style.backgroundImage = "url('" + document.getElementById("infoImg_" + imgInd).src + "')";
}

function hideTextHoverHandler(ev) {
    var container = document.getElementById("infoImage");
    container.style.backgroundImage = "url('" + defaultInfoImgSrc + "')";
}

function initInfoText() {
    var imgInd = 0;
    var tokens = siteSettings.about_text.match(/\S+/g) || []; // splits string on whitespace
    var aboutText = "";
    for (var i = 0; i < tokens.length; i++) {
        if (tokens[i].startsWith("(")) {
            var curTok = tokens[i].match(/\([^)]*\)|\[[^\]]*\]/g) || [];
            var tokEnd = tokens[i].replace(/\([^)]*\)|\[[^\]]*\]/g, "");
            if (curTok[1].indexOf("http") > -1) { // this is a link
                var text = curTok[0].slice(1,curTok[0].length-1);
                var url = curTok[1].slice(1,curTok[1].length-1);
                aboutText += "<a style='border-bottom: 1px solid " + siteSettings.about_font_color + "' href='" + url + "' target='_blank'>" + text + "</a>" + tokEnd + " ";
            }
            else { // this is a hover image
                var text = curTok[0].slice(1,curTok[0].length-1);
                var imgName = curTok[1].slice(1,curTok[1].length-1);
                var imgRef = storage.ref("images/" + imgName);
                imagesToLoad++;
                imgInd++;
                imgRef.getDownloadURL().then(insertInfoImg.bind(null,imgInd));

                aboutText += "<span style='border-bottom: 1px solid " + siteSettings.about_font_color + "' class='infoImageHover' id='hoverimage_" + imgInd + "'>" + text + "</span>" + tokEnd + " ";
            }
        }
        else aboutText += tokens[i] + " ";
    }

    document.getElementById("infoText").innerHTML = aboutText;
    var spanEls = document.getElementsByClassName("infoImageHover");
    for (var i = 0; i < spanEls.length; i++) {
        spanEls[i].addEventListener("mouseover",showTextHoverHandler);
        spanEls[i].addEventListener("mouseleave",hideTextHoverHandler);
    }
}

var defaultInfoImgSrc;

function insertDefaultInfoImage(url) {
    var container = document.getElementById("infoImage");
    var imgEl = document.createElement("img");
    imgEl.onload = imageLoadedCallback;
    imgEl.src = url;
    defaultInfoImgSrc = url;
    container.style.backgroundImage = "url('" + url + "')";
}

function initInfoPage() {
    document.getElementById("infoButton").addEventListener("click",toggleInfoPage);
    resizeInfoHandler();

    var imgRef = storage.ref("images/" + siteSettings.default_info_image);
    imagesToLoad++;
    imgRef.getDownloadURL().then(insertDefaultInfoImage);

    initInfoText();
}

const LOADING_TEXT = "LOADING ";
var loadingCont;
var loadingTextEl;
var curLoadTextInd = 0;
var loadingInterval;

function loadingStep() {
    var loadPerc = (imagesLoaded/imagesToLoad);
    var textWidthPerc = loadingTextEl.offsetWidth/window.innerWidth;

    if (loadPerc > 0.05) loadingTextEl.classList.remove("blinking");

    if (loadPerc > 0 && textWidthPerc >= 1) {
        clearInterval(loadingInterval);
        loadingCont.style.opacity = 0;
        loadingCont.style.color = "black";
        setTimeout(function () {loadingCont.style.display = "none";}, 2200);
        incTime = true;
        return;
    }

    if (textWidthPerc < loadPerc) {
        loadingTextEl.innerHTML = loadingTextEl.innerHTML + LOADING_TEXT.slice(curLoadTextInd,curLoadTextInd+1);
        curLoadTextInd++;
        if (curLoadTextInd > LOADING_TEXT.length-1) curLoadTextInd = 0;
        textWidthPerc = loadingTextEl.offsetWidth/window.innerWidth;
    }
}

function initLoader() {
    loadingCont = document.getElementById("loadingCont");
    loadingTextEl = document.getElementById("loadingText");

    loadingInterval = setInterval(loadingStep, 10);
}

function initLayout() {
    initLoader();
    storage = firebase.storage();
    var container = document.getElementById("mainScroll");
    for (var i = 0; i < cmsData.length; i++) {
        container.appendChild(createRow(i,cmsData[i]));
    }
    headerElement = document.getElementById("header");
    scrollElement = document.getElementById("main");
    hideHeaderInterval = setInterval(checkScrollAmt, 10);
    initInfoPage();

    window.addEventListener("resize",resizeInfoHandler);
}

initLayout();