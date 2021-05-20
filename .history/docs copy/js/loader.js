var param_vars = {
    background_color: "#000000",

    light1_color: "#ffffff",
    light2_color: "#545454",

    water_color: "#ffffff",
    water_specular: "#111111",
    water_shininess: 100.0,
    water_warp: 1.0,

    scroll_timing: 0.0,
    repeat_spacing: 1.0,

    mouse_size: 5.0,
    viscosity: 0.0,

    font_size: 300,
    font_leading: 0,

    pos_x: 0.0,
    pos_y: 200.0,
    pos_z: 350.0,

    nat_wave_ripple: 18.0,
    nat_wave_width: 1.0,

    gradient_start: 0.5,
    gradient_amt: 3,
};

const FB_CONFIG = {
    apiKey: "AIzaSyD2DD4GebTWieixhuUpInB6GTewZMmLbMg",
    databaseURL: "https://juliashafer-fcb26.firebaseio.com",
    projectId: "juliashafer-fcb26",
    storageBucket: "gs://juliashafer-fcb26.appspot.com",
};

const FRAG_TYPE = "x-shader/x-fragment";
const VERT_TYPE = "x-shader/x-vertex";

var shaders = [
    {
        name: "heightmap",
        url: "./shaders/heightmap.frag",
        type: FRAG_TYPE
    },
    {
        name: "smooth",
        url: "./shaders/smooth.frag",
        type: FRAG_TYPE
    },
    {
        name: "phong",
        url: "./shaders/phong.frag",
        type: FRAG_TYPE
    },
    {
        name: "water",
        url: "./shaders/water.vert",
        type: VERT_TYPE
    }
];

var siteSettings;
var cmsData;
var contactData;

function ShaderLoader(callback,progress,error) {
    var loader = new THREE.FileLoader(THREE.DefaultLoadingManager);
    loader.setResponseType('text');

    if (shaders.length < 1) {
        callback();
        return;
    }

    shaders[0].callback = callback;
    shaders[0].progress = progress;
    shaders[0].error    = error;

    loader.load(shaders[0].url, function (shaderText) {
        var shaderScr       = document.createElement("script");
        shaderScr.innerHTML = shaderText;
        shaderScr.type      = shaders[0].type;
        shaderScr.id        = shaders[0].name;
        document.getElementsByTagName("head")[0].appendChild(shaderScr);

        var callback = shaders[0].callback;
        var progress = shaders[0].progress;
        var error    = shaders[0].error;

        shaders.splice(0,1);

        ShaderLoader(callback,progress,error);
    }, progress, error);
}

function addThreeScript() {
    var scrEl = document.createElement("script");
    scrEl.type = 'text/javascript';
    scrEl.src = './js/three_main.js';

    document.getElementsByTagName("head")[0].appendChild(scrEl);
}

function addLayoutScript() {
    var scrEl = document.createElement("script");
    scrEl.type = 'text/javascript';
    scrEl.src = './js/layout_main.js';

    document.getElementsByTagName("head")[0].appendChild(scrEl);
}

function loadConfigData(callback) {
    firebase.initializeApp(FB_CONFIG);
    var database = firebase.database();

    database.ref("/").once('value').then(function(snapshot) {
        var data = snapshot.val();

        initSiteSettings(data);

        // parse water_settings data
        for (var i = 0; i < data.water_settings.length; i++) {
            param_vars[data.water_settings[i].label] = data.water_settings[i].value;
        }

        cmsData = [];
        for (var i = 0; i < data.cms.length; i++) {
            cmsData.push({
                numColumns: data.cms[i].num_columns,
                columns: []
            });
            for (var col = 1; col <= cmsData[i].numColumns; col++) {
                cmsData[i].columns.push({
                    type: data.cms[i]["column" + col + "_type"],
                    content: data.cms[i]["column" + col + "_content"],
                    size: data.cms[i]["column" + col + "_size"],
                });
            }
        }

        initContactInfo(data);
    }).then(callback);
}

function initContactInfo(data) {
    contactData = {};
    for (var i = 0; i < data.contact.length; i++) {
        contactData[data.contact[i].label] = data.contact[i]["value"];
    }

    document.getElementById("nameCont").innerHTML  = contactData.name;
    document.getElementById("phoneCont").innerHTML = contactData.phone;
    document.getElementById("titleCont").innerHTML = contactData.title;
    document.getElementById("emailCont").innerHTML = contactData.email;
    document.getElementById("emailCont").href      = "mailto:" + contactData.email;
}

function initSiteSettings(data) {
    siteSettings = {};
    for (var i = 0; i < data.general_settings.length; i++) {
        siteSettings[data.general_settings[i].label] = data.general_settings[i]["value"];
    }

    document.getElementById("mainScroll").style.backgroundColor = siteSettings.main_background;
    document.getElementById("mainScroll").style.color           = siteSettings.main_font_color;
    document.getElementById("infoCont").style.backgroundColor   = siteSettings.about_background;
    document.getElementById("infoCont").style.color             = siteSettings.about_font_color;
    aboutFontColor = siteSettings.about_font_color;

    document.body.style.fontSize      = siteSettings.global_font_size;
    document.body.style.lineHeight    = siteSettings.global_line_spacing;
    document.body.style.letterSpacing = siteSettings.global_letter_spacing;
}

function init() {
    loadConfigData(function () {
        canvasFont = new FontFace('Suisse', 'url("./font/XL/SuisseWorks-Book-WebXL.ttf")');
        document.fonts.add(canvasFont);
        canvasFont.load().then(function() {
            ShaderLoader(addThreeScript);
        });
        addLayoutScript();
    });
}

window.onload = init;
