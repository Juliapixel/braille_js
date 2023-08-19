"use strict";

const BRAILLE_CHARS = [
'⠀', '⠁', '⠂', '⠃', '⠄', '⠅', '⠆', '⠇', '⠈', '⠉', '⠊', '⠋', '⠌', '⠍', '⠎', '⠏', '⠐', '⠑', '⠒', '⠓', '⠔', '⠕', '⠖', '⠗', '⠘', '⠙',
'⠚', '⠛', '⠜', '⠝', '⠞', '⠟', '⠠', '⠡', '⠢', '⠣', '⠤', '⠥', '⠦', '⠧', '⠨', '⠩', '⠪', '⠫', '⠬', '⠭', '⠮', '⠯', '⠰', '⠱', '⠲',
'⠳', '⠴', '⠵', '⠶', '⠷', '⠸', '⠹', '⠺', '⠻', '⠼', '⠽', '⠾', '⠿', '⡀', '⡁', '⡂', '⡃', '⡄', '⡅', '⡆', '⡇', '⡈', '⡉', '⡊', '⡋',
'⡌', '⡍', '⡎', '⡏', '⡐', '⡑', '⡒', '⡓', '⡔', '⡕', '⡖', '⡗', '⡘', '⡙', '⡚', '⡛', '⡜', '⡝', '⡞', '⡟', '⡠', '⡡', '⡢', '⡣', '⡤',
'⡥', '⡦', '⡧', '⡨', '⡩', '⡪', '⡫', '⡬', '⡭', '⡮', '⡯', '⡰', '⡱', '⡲', '⡳', '⡴', '⡵', '⡶', '⡷', '⡸', '⡹', '⡺', '⡻', '⡼', '⡽',
'⡾', '⡿', '⢀', '⢁', '⢂', '⢃', '⢄', '⢅', '⢆', '⢇', '⢈', '⢉', '⢊', '⢋', '⢌', '⢍', '⢎', '⢏', '⢐', '⢑', '⢒', '⢓', '⢔', '⢕', '⢖',
'⢗', '⢘', '⢙', '⢚', '⢛', '⢜', '⢝', '⢞', '⢟', '⢠', '⢡', '⢢', '⢣', '⢤', '⢥', '⢦', '⢧', '⢨', '⢩', '⢪', '⢫', '⢬', '⢭', '⢮', '⢯',
'⢰', '⢱', '⢲', '⢳', '⢴', '⢵', '⢶', '⢷', '⢸', '⢹', '⢺', '⢻', '⢼', '⢽', '⢾', '⢿', '⣀', '⣁', '⣂', '⣃', '⣄', '⣅', '⣆', '⣇', '⣈',
'⣉', '⣊', '⣋', '⣌', '⣍', '⣎', '⣏', '⣐', '⣑', '⣒', '⣓', '⣔', '⣕', '⣖', '⣗', '⣘', '⣙', '⣚', '⣛', '⣜', '⣝', '⣞', '⣟', '⣠', '⣡',
'⣢', '⣣', '⣤', '⣥', '⣦', '⣧', '⣨', '⣩', '⣪', '⣫', '⣬', '⣭', '⣮', '⣯', '⣰', '⣱', '⣲', '⣳', '⣴', '⣵', '⣶', '⣷', '⣸', '⣹', '⣺',
'⣻', '⣼', '⣽', '⣾', '⣿'
];

class BrailleImg {
    /**
     *
     * @param {number} width
     * @param {number} height
     */
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.byteWidth = Math.ceil(width / 2);
        this.byteHeight = Math.ceil(height / 4);
        this.buffer = new Uint8Array(this.byteWidth * this.byteHeight);
    }

    /**
     * takes an HTMLImageElement, puts its image data into a canvas, scaled to
     * the specified width, preserving aspect ratio. applies no dithering to it,
     * using a simple threshold filter.
     *
     * @param {HTMLImageElement} imgElement
     * @param {number} width
     * @param {number} height
     */
    static fromImageElement(imgElement, width) {
        let height = Math.round((imgElement.naturalHeight / imgElement.naturalWidth) * width);
        let brailleImg = new BrailleImg(width, height);

        let imgCanvas = document.createElement("canvas");
        imgCanvas.width = width;
        imgCanvas.height = height;
        let ctx = imgCanvas.getContext("2d");
        ctx.drawImage(imgElement, 0, 0, imgCanvas.width, imgCanvas.height);

        let imgData = ctx.getImageData(0, 0, imgCanvas.width, imgCanvas.height);
        for (let y = 0; y < imgData.height; y++) {
            for (let x = 0; x < imgData.width; x++) {
                let [r, g, b, a] = getPixel(x, y, imgData);
                if (luminance(r, g, b, a) > 0.5) {
                    brailleImg.setDot(x, y, true);
                }
            }
        }
        return brailleImg;
    }

    /**
     * takes an HTMLImageElement, puts its image data into a canvas, scaled to
     * the specified width, preserving aspect ratio. applies Sierra dithering
     * to it in order to preserve shading.
     *
     * @param {HTMLImageElement} imgElement
     * @param {number} width
     */
    static fromImageElementDithered(imgElement, width) {
        let height = Math.round((imgElement.naturalHeight / imgElement.naturalWidth) * width);
        let brailleImg = new BrailleImg(width, height);

        let imgCanvas = document.createElement("canvas");
        imgCanvas.width = width;
        imgCanvas.height = height;
        let ctx = imgCanvas.getContext("2d");
        ctx.drawImage(imgElement, 0, 0, imgCanvas.width, imgCanvas.height);

        let imgData = ctx.getImageData(0, 0, imgCanvas.width, imgCanvas.height);

        // turn image into a grayscale version, with values [0, 255]
        for (let y = 0; y < imgData.height; y++) {
            for (let x = 0; x < imgData.width; x++) {
                let pix = getPixel(x, y, imgData);
                let luma = luminance(pix[0], pix[1], pix[2], pix[3]) * 255;
                setPixel(x, y, luma, luma, luma, 255, imgData);
            }
        }

        // takes that grayscale version, diffuses error throughout it and
        // puts dots on braille image.
        for (let y = 0; y < imgData.height; y++) {
            for (let x = 0; x < imgData.width; x++) {
                let luma = getPixel(x, y, imgData)[0];
                let error = 0;
                if (luma > 127) {
                    error = luma - 255;
                    brailleImg.setDot(x, y, true);
                } else {
                    error = luma;
                }
                error /= 32;
                addToPixel(x+1, y  , error*5, imgData);
                addToPixel(x+2, y  , error*3, imgData);
                addToPixel(x-2, y+1, error*2, imgData);
                addToPixel(x-1, y+1, error*4, imgData);
                addToPixel(x  , y+1, error*5, imgData);
                addToPixel(x+1, y+1, error*4, imgData);
                addToPixel(x+2, y+1, error*2, imgData);
                addToPixel(x-1, y+2, error*2, imgData);
                addToPixel(x  , y+2, error*3, imgData);
                addToPixel(x+1, y+2, error*2, imgData);
            }
        }
        return brailleImg;
    }

    /**
     *
     * @param {number} x
     * @param {number} y
     * @returns {number}
     */
    static getBitMask(x, y) {
        if (x % 2 == 0) {
            switch (y % 4) {
                case 0:
                    return 0b00000001;
                case 1:
                    return 0b00000010;
                case 2:
                    return 0b00000100;
                case 3:
                    return 0b01000000;
            }
        } else {
            switch (y % 4) {
                case 0:
                    return 0b00001000;
                case 1:
                    return 0b00010000;
                case 2:
                    return 0b00100000;
                case 3:
                    return 0b10000000;
            }
        }
    }

    /**
     *
     * @param {number} x
     * @param {number} y
     * @param {boolean} val
     */
    setDot(x, y, val) {
        let xBytePos = Math.floor(x / 2);
        let yBytePos = Math.floor(y / 4);
        let mask = BrailleImg.getBitMask(x, y);
        if (val) {
            this.buffer[xBytePos + yBytePos * this.byteWidth] |= mask;
        } else {
            this.buffer[xBytePos + yBytePos * this.byteWidth] &= (~mask);
        }
    }

    /**
     * returns the {@link BrailleImg} as a string, with each line separated by a
     * newline.
     *
     * @param {bool} allowBlankChars if false, all blank braille characters will
     * be replaced by a character with a single dot. necessary in most cases,
     * since the blank character renders with a different width as non-blank
     * ones, even in monospace fonts. (don't ask me why)
     * @returns {string}
     */
    toString(allowBlankChars) {
        let out = "";
        for (let y = 0; y < this.byteHeight; y++) {
            for (let x = 0; x < this.byteWidth; x++) {
                let val = this.buffer[x + y * this.byteWidth];
                if (!allowBlankChars) {
                    if (val == 0) {
                        val = 1;
                    }
                }
                out += BRAILLE_CHARS[val];
            }
            if (y != this.byteHeight - 1) {
                out += "\n";
            }
        }
        return out;
    }
}

/**
 * takes RGBA values in range [0, 255] and returns luma values in range [0, 1]
 *
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @param {number} a
 * @returns
 */
function luminance(r, g, b, a) {
    return (0.2126*r/255 + 0.7152*g/255 + 0.0722*b/255) * (a / 255);
}

/**
 *
 * @param {number} x
 * @param {number} y
 * @param {ImageData} imgData
 * @returns {[number] | null}
 */
function getPixel(x, y, imgData) {
    if (x < 0 || y < 0 || x >= imgData.width || y >= imgData.height) {
        return null;
    }
    let pos = (y * imgData.width + x) * 4;
    return [
        imgData.data[pos],
        imgData.data[pos + 1],
        imgData.data[pos + 2],
        imgData.data[pos + 3],
    ]
}

/**
 *
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @param {number} a
 * @param {ImageData} imgData
 */
function setPixel(x, y, r, g, b, a, imgData) {
    if (x < 0 || y < 0 || x >= imgData.width || y >= imgData.height) {
        return;
    }
    let pos = (y * imgData.width + x) * 4;
    imgData.data[pos] = r
    imgData.data[pos + 1] = g
    imgData.data[pos + 2] = b
    imgData.data[pos + 3] = a
}

/**
 * adds the provided value to every color channel of the pixel, clamping its
 * value to the range [0, 255]
 *
 * @param {number} x
 * @param {number} y
 * @param {number} rhs
 * @param {ImageData} imgData
 * @returns {[number]}
 */
function addToPixel(x, y, rhs, imgData) {
    let pix = getPixel(x, y, imgData);
    if (pix != null) {
        pix[0] += rhs;
        pix[1] += rhs;
        pix[2] += rhs;

        pix.map((val, _i, _a) => {
            if (val > 255) {
                val = 255;
            } else if (val < 0) {
                val = 0;
            }
        });
        setPixel(x, y, pix[0], pix[1], pix[2], pix[3], imgData);
    }
}

function loadImg() {
    const fileElement = document.getElementById("fileInput");
    let imgUrl = window.URL.createObjectURL(fileElement.files[0])

    let textArea = document.getElementById("braille");
    let imgElement = document.getElementById("preview");
    imgElement.crossOrigin = "anonymous"
    imgElement.src = imgUrl;
    textArea.innerText = "";

    imgElement.onload = function(_ev) {
        const brailleWidth = document.getElementById("chosenWidth").value;
        let braille = BrailleImg.fromImageElementDithered(imgElement, brailleWidth);

        let textArea = document.getElementById("braille");
        textArea.contentEditable = false;
        textArea.innerText = braille.toString(false);
    }
}
