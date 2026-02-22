function analyseCriteria(face) {
    let points = {
        leftIris: face.annotations.rightEyeIris[0],
        rightIris: face.annotations.leftEyeIris[0],
        leftLateralCanthus: face.annotations.rightEyeLower1[0],
        leftMedialCanthus: face.annotations.rightEyeLower1[7],
        rightLateralCanthus: face.annotations.leftEyeLower1[0],
        rightMedialCanthus: face.annotations.leftEyeLower1[7],
        leftEyeUpper: face.annotations.rightEyeUpper0[4],
        leftEyeLower: face.annotations.rightEyeLower0[4],
        rightEyeUpper: face.annotations.leftEyeUpper0[4],
        rightEyeLower: face.annotations.leftEyeLower0[4],
        leftEyebrow: face.annotations.rightEyebrowUpper[6],
        rightEyebrow: face.annotations.leftEyebrowUpper[6],
        leftZygo: face.annotations.silhouette[28],
        rightZygo: face.annotations.silhouette[8],
        noseBottom: face.annotations.noseBottom[0],
        leftNoseCorner: face.annotations.noseRightCorner[0],
        rightNoseCorner: face.annotations.noseLeftCorner[0],
        leftCupidBow: face.annotations.lipsUpperOuter[4],
        lipSeparation: face.annotations.lipsUpperInner[5],
        rightCupidBow: face.annotations.lipsUpperOuter[6],
        leftLipCorner: face.annotations.lipsUpperOuter[0],
        rightLipCorner: face.annotations.lipsUpperOuter[10],
        lowerLip: face.annotations.lipsLowerOuter[4],
        upperLip: face.annotations.lipsUpperOuter[5],
        leftGonial: face.annotations.silhouette[24],
        rightGonial: face.annotations.silhouette[12],
        chinLeft: face.annotations.silhouette[19],
        chinTip: face.annotations.silhouette[18],
        chinRight: face.annotations.silhouette[17],
    };
    return [points, {
        midfaceRatio: new MidfaceRatio(face, points),
        facialWidthToHeightRatio: new FacialWidthToHeightRatio(face, points),
        chinToPhiltrumRatio: new ChinToPhiltrumRatio(face, points),
        canthalTilt: new CanthalTilt(face, points),
        mouthToNoseRatio: new MouthToNoseRatio(face, points),
        bigonialWidth: new BigonialWidth(face, points),
        lipRatio: new LipRatio(face, points),
        eyeSeparationRatio: new EyeSeparationRatio(face, points),
        eyeToMouthAngle: new EyeToMouthAngle(face, points),
        lowerThirdHeight: new LowerThirdHeight(face, points),
        palpebralFissureLength: new PalpebralFissureLength(face, points),
        eyeColor: new EyeColor(face, points),
    }];
}

async function setupDatabase() {
    return await fetch("database.json")
        .then(res => res.text())
        .then(text => {
            console.log("✅ database.json loaded");
            return JSON.parse(text);
        })
        .catch(err => {
            console.error("❌ Failed to load or parse database.json:", err);
            return { entries: {} };
        });

}

class Criteria {
    constructor(face, points) {
        this.face = face;
        this.points = points;

        for (let i in points) {
            if (points.hasOwnProperty(i)) {
                Object.defineProperty(this, i, { get: () => this.points[i] });
            }
        }

        return this;
    }

    createPoint(name, value) {
        this.points[name] = value;
        Object.defineProperty(this, name, { get: () => this.points[name] });
    }

    calculate() {
        /* abstract */
    }

    render() {
        /* abstract */
    }

    ideal() {
        /* abstract */
    }

    assess() {
        /* abstract */
    }

    draw(ctx) {
        /* abstract */
    }

    necessaryPoints() {
        /* abstract */
    }
}

class MidfaceRatio extends Criteria {
    constructor(face, points) {
        super(face, points);

        let bottomLine = Fn.fromTwoPoints(this.leftCupidBow, this.rightCupidBow);
        let leftLine = bottomLine.perpendicular(this.leftIris);
        let rightLine = bottomLine.perpendicular(this.rightIris);
        this.createPoint("bottomLeftMidface", bottomLine.intersect(leftLine));
        this.createPoint("bottomRightMidface", bottomLine.intersect(rightLine));
    }

    calculate() {
        this.ratio = ((distance(this.leftIris, this.rightIris) / distance(this.leftIris, this.bottomLeftMidface)) +
            (distance(this.leftIris, this.rightIris) / distance(this.rightIris, this.bottomRightMidface))) / 2;
    }

    render() {
        return `${round(this.ratio, 2)}`;
    }

    ideal() {
        return `${database.entries.midfaceRatio.idealLower} to ${database.entries.midfaceRatio.idealUpper}`;
    }

    assess() {
        let { idealLower, idealUpper, deviation, deviatingLow, deviatingHigh } = database.entries.midfaceRatio;
        return assess(this.ratio, idealLower, idealUpper, deviation, deviatingLow, deviatingHigh);
    }

    draw(ctx) {
        draw(ctx, "red", [this.leftIris, this.rightIris, this.bottomRightMidface, this.bottomLeftMidface]);
    }

    necessaryPoints() {
        return ["leftIris", "rightIris", "bottomLeftMidface", "bottomRightMidface"];
    }
}

class FacialWidthToHeightRatio extends Criteria {
    constructor(face, points) {
        super(face, points);

        let topLine = Fn.fromTwoPoints(this.leftEyeUpper, this.rightEyeUpper);
        let bottomLine = Fn.fromTwoPoints(this.leftCupidBow, this.rightCupidBow);
        let leftLine = topLine.perpendicular(this.leftZygo);
        let rightLine = topLine.perpendicular(this.rightZygo);
        this.createPoint("topLeft", leftLine.intersect(topLine));
        this.createPoint("topRight", rightLine.intersect(topLine));
        this.createPoint("bottomLeft", leftLine.intersect(bottomLine));
        this.createPoint("bottomRight", rightLine.intersect(bottomLine));
    }

    calculate() {
        this.ratio = (((distance(this.topLeft, this.topRight) / distance(this.topLeft, this.bottomLeft))
            + (distance(this.bottomLeft, this.bottomRight) / distance(this.topRight, this.bottomRight))) / 2);
    }

    render() {
        return `${round(this.ratio, 2)}`;
    }

    ideal() {
        return `more than ${database.entries.facialWidthToHeightRatio.idealLower}`;
    }

    assess() {
        let { idealLower, deviation, deviatingLow } = database.entries.facialWidthToHeightRatio;
        return assess(this.ratio, idealLower, undefined, deviation, deviatingLow, undefined);
    }

    draw(ctx) {
        draw(ctx, "lightblue", [this.topLeft, this.topRight, this.bottomRight, this.bottomLeft])
    }

    necessaryPoints() {
        return ["topLeft", "topRight", "bottomLeft", "bottomRight"];
    }
}

class ChinToPhiltrumRatio extends Criteria {
    calculate() {
        this.ratio = distance(this.chinTip, this.lowerLip) / distance(this.upperLip, this.noseBottom);
    }

    render() {
        return `${round(this.ratio, 2)}`;
    }

    ideal() {
        return `${database.entries.chinToPhiltrumRatio.idealLower} to ${database.entries.chinToPhiltrumRatio.idealUpper}`;
    }

    assess() {
        let { idealLower, idealUpper, deviation, deviatingLow, deviatingHigh } = database.entries.chinToPhiltrumRatio;
        return assess(this.ratio, idealLower, idealUpper, deviation, deviatingLow, deviatingHigh);
    }

    draw(ctx) {
        draw(ctx, "blue", [this.chinTip, this.lowerLip]);
        draw(ctx, "blue", [this.upperLip, this.noseBottom]);
    }

    necessaryPoints() {
        return ["chinTip", "lowerLip", "upperLip", "noseBottom"];
    }
}

class CanthalTilt extends Criteria {
    calculate() {
        let line = [this.rightZygo[0] - this.leftZygo[0], this.rightZygo[1] - this.leftZygo[1]];
        let lineFn = Fn.fromTwoPoints(this.rightZygo, this.leftZygo);
        let left = [this.leftLateralCanthus[0] - this.leftMedialCanthus[0], this.leftLateralCanthus[1] - this.leftMedialCanthus[1]];
        let right = [this.rightLateralCanthus[0] - this.rightMedialCanthus[0], this.rightLateralCanthus[1] - this.rightMedialCanthus[1]];
        let pointOnLeftLine = lineFn.getY(this.leftMedialCanthus[0]) + left[1];
        let pointOnRightLine = lineFn.getY(this.rightMedialCanthus[0]) + right[1];
        this.leftCanthalTilt = Math.acos(
            Math.abs((-1) * (line[0] * left[0] + line[1] * left[1]))
            /
            (Math.sqrt(line[0] ** 2 + line[1] ** 2) * Math.sqrt(left[0] ** 2 + left[1] ** 2))
        ) * (180 / Math.PI) * (lineFn.getY(this.leftLateralCanthus[0]) - pointOnLeftLine > 0 ? 1 : -1);
        this.rightCanthalTilt = Math.acos(
            Math.abs(line[0] * right[0] + line[1] * right[1])
            /
            (Math.sqrt(line[0] ** 2 + line[1] ** 2) * Math.sqrt(right[0] ** 2 + right[1] ** 2))
        ) * (180 / Math.PI) * (lineFn.getY(this.rightLateralCanthus[0]) - pointOnRightLine > 0 ? 1 : -1);
    }

    render() {
        return `left ${round(this.rightCanthalTilt, 0)}°, right ${round(this.leftCanthalTilt, 0)}°`;
    }

    ideal() {
        return `more than ${database.entries.canthalTilt.idealLower}`;
    }

    assess() {
        let { idealLower, deviation, deviatingLow } = database.entries.canthalTilt;
        return assess((this.leftCanthalTilt + this.rightCanthalTilt) / 2, idealLower, undefined, deviation, deviatingLow, undefined);
    }

    draw(ctx) {
        draw(ctx, "pink", [this.leftLateralCanthus, this.leftMedialCanthus]);
        draw(ctx, "pink", [this.rightLateralCanthus, this.rightMedialCanthus]);
    }

    necessaryPoints() {
        return ["leftLateralCanthus", "leftMedialCanthus", "rightLateralCanthus", "rightMedialCanthus"];
    }
}

class MouthToNoseRatio extends Criteria {
    calculate() {
        this.ratio = distance(this.leftLipCorner, this.rightLipCorner) / distance(this.leftNoseCorner, this.rightNoseCorner);
    }

    render() {
        return `${round(this.ratio, 2)}`;
    }

    ideal() {
        return `${database.entries.mouthToNoseRatio.idealLower} to ${database.entries.mouthToNoseRatio.idealUpper}`;
    }

    assess() {
        let { idealLower, idealUpper, deviation, deviatingLow, deviatingHigh } = database.entries.mouthToNoseRatio;
        return assess(this.ratio, idealLower, idealUpper, deviation, deviatingLow, deviatingHigh);
    }

    draw(ctx) {
        draw(ctx, "purple", [this.leftLipCorner, this.rightLipCorner]);
        draw(ctx, "purple", [this.leftNoseCorner, this.rightNoseCorner]);
    }

    necessaryPoints() {
        return ["leftLipCorner", "rightLipCorner", "leftNoseCorner", "rightNoseCorner"];
    }
}

class BigonialWidth extends Criteria {
    calculate() {
        this.ratio = distance(this.leftZygo, this.rightZygo) / distance(this.leftGonial, this.rightGonial);
    }

    render() {
        return `${round(this.ratio, 2)}`;
    }

    ideal() {
        return `${database.entries.bigonialWidth.idealLower} to ${database.entries.bigonialWidth.idealUpper}`;
    }

    assess() {
        let { idealLower, idealUpper, deviation, deviatingLow, deviatingHigh } = database.entries.bigonialWidth;
        return assess(this.ratio, idealLower, idealUpper, deviation, deviatingLow, deviatingHigh);
    }

    draw(ctx) {
        draw(ctx, "gold", [this.leftGonial, this.rightGonial]);
        draw(ctx, "gold", [this.leftZygo, this.rightZygo]);
    }

    necessaryPoints() {
        return ["leftZygo", "rightZygo", "leftGonial", "rightGonial"];
    }
}

class LipRatio extends Criteria {
    constructor(face, points) {
        super(face, points);

        let topLip = Fn.fromTwoPoints(this.leftCupidBow, this.rightCupidBow);
        let lowerLip = topLip.parallel(this.lowerLip);
        this.createPoint("upperLipEnd", topLip.intersect(topLip.perpendicular(this.lipSeparation)));
        this.createPoint("lowerLipEnd", lowerLip.intersect(lowerLip.perpendicular(this.lipSeparation)));
    }

    calculate() {
        this.ratio = distance(this.lowerLipEnd, this.lipSeparation) / distance(this.upperLipEnd, this.lipSeparation);
    }

    render() {
        return `${round(this.ratio, 2)}`;
    }

    ideal() {
        return `${database.entries.lipRatio.idealLower} to ${database.entries.lipRatio.idealUpper}`;
    }

    assess() {
        let { idealLower, idealUpper, deviation, deviatingLow, deviatingHigh } = database.entries.lipRatio;
        return assess(this.ratio, idealLower, idealUpper, deviation, deviatingLow, deviatingHigh);
    }

    draw(ctx) {
        draw(ctx, "lightgreen", [this.upperLipEnd, this.lipSeparation]);
        draw(ctx, "lightgreen", [this.lipSeparation, this.lowerLipEnd]);
    }

    necessaryPoints() {
        return ["upperLipEnd", "lowerLipEnd", "lipSeparation"];
    }
}

class EyeSeparationRatio extends Criteria {
    calculate() {
        this.ratio = distance(this.leftIris, this.rightIris) / distance(this.leftZygo, this.rightZygo);
    }

    render() {
        return `${round(this.ratio, 2)}`;
    }

    ideal() {
        return `${database.entries.eyeSeparationRatio.idealLower} to ${database.entries.eyeSeparationRatio.idealUpper}`;
    }

    assess() {
        let { idealLower, idealUpper, deviation, deviatingLow, deviatingHigh } = database.entries.eyeSeparationRatio;
        return assess(this.ratio, idealLower, idealUpper, deviation, deviatingLow, deviatingHigh);
    }

    draw(ctx) {
        draw(ctx, "orange", [this.leftIris, this.rightIris]);
        draw(ctx, "orange", [this.leftZygo, this.rightZygo]);
    }

    necessaryPoints() {
        return ["leftIris", "rightIris", "leftZygo", "rightZygo"];
    }
}

class EyeToMouthAngle extends Criteria {
    calculate() {
        let a = [this.leftIris[0] - this.lipSeparation[0], this.leftIris[1] - this.lipSeparation[1]];
        let b = [this.rightIris[0] - this.lipSeparation[0], this.rightIris[1] - this.lipSeparation[1]];
        this.angle = Math.acos(
            (a[0] * b[0] + a[1] * b[1])
            /
            (Math.sqrt(a[0] ** 2 + a[1] ** 2) * Math.sqrt(b[0] ** 2 + b[1] ** 2))
        ) * (180 / Math.PI);
    }

    render() {
        return `${round(this.angle, 0)}°`;
    }

    ideal() {
        return `${database.entries.eyeToMouthAngle.idealLower}° to ${database.entries.eyeToMouthAngle.idealUpper}°`;
    }

    assess() {
        let { idealLower, idealUpper, deviation, deviatingLow, deviatingHigh } = database.entries.eyeToMouthAngle;
        return assess(this.angle, idealLower, idealUpper, deviation, deviatingLow, deviatingHigh);
    }

    draw(ctx) {
        draw(ctx, "brown", [this.leftIris, this.lipSeparation, this.rightIris, this.lipSeparation, this.leftIris]);
    }

    necessaryPoints() {
        return ["leftIris", "lipSeparation", "rightIris"];
    }
}

class LowerThirdHeight extends Criteria {
    calculate() {
        let middlePoint = [this.leftNoseCorner[0] + (1 / 2) * (this.rightNoseCorner[0] - this.leftNoseCorner[0]), this.leftNoseCorner[1] + (1 / 2) * (this.rightNoseCorner[1] - this.leftNoseCorner[1])];
        let middleLine = Fn.fromTwoPoints(this.leftNoseCorner, this.rightNoseCorner).perpendicular(middlePoint);
        let topPoint = middleLine.intersect(Fn.fromTwoPoints(this.leftEyebrow, this.rightEyebrow));
        let bottomPoint = middleLine.intersect(Fn.fromTwoPoints(this.chinLeft, this.chinRight));
        this.ratio = distance(bottomPoint, middlePoint) / distance(middlePoint, topPoint);
    }

    render() {
        return `${round(this.ratio, 2)}`;
    }

    ideal() {
        return `more than ${database.entries.lowerThirdHeight.idealLower}`;
    }

    assess() {
        let { idealLower, deviation, deviatingLow } = database.entries.lowerThirdHeight;
        return assess(this.ratio, idealLower, undefined, deviation, deviatingLow, undefined);
    }

    draw(ctx) {
        draw(ctx, "grey", [this.leftEyebrow, this.rightEyebrow, this.rightNoseCorner, this.leftNoseCorner]);
        draw(ctx, "grey", [this.leftNoseCorner, this.rightNoseCorner, this.chinRight, this.chinLeft]);
    }

    necessaryPoints() {
        return ["leftNoseCorner", "rightNoseCorner", "leftEyebrow", "rightEyebrow", "chinLeft", "chinRight"];
    }
}

class PalpebralFissureLength extends Criteria {
    calculate() {
        this.leftPFL = distance(this.leftLateralCanthus, this.leftMedialCanthus) / distance(this.leftEyeUpper, this.leftEyeLower);
        this.rightPFL = distance(this.rightLateralCanthus, this.rightMedialCanthus) / distance(this.rightEyeUpper, this.rightEyeLower);
    }

    render() {
        return `left ${round(this.rightPFL, 2)}, right ${round(this.leftPFL, 2)}`;
    }

    ideal() {
        return `more than ${database.entries.palpebralFissureLength.idealLower}`;
    }

    assess() {
        let { idealLower, deviation, deviatingLow } = database.entries.palpebralFissureLength;
        return assess((this.leftPFL + this.rightPFL) / 2, idealLower, undefined, deviation, deviatingLow, undefined);
    }

    draw(ctx) {
        draw(ctx, "aquamarine", [this.leftLateralCanthus, this.leftMedialCanthus]);
        draw(ctx, "aquamarine", [this.leftEyeUpper, this.leftEyeLower]);
        draw(ctx, "aquamarine", [this.rightLateralCanthus, this.rightMedialCanthus]);
        draw(ctx, "aquamarine", [this.rightEyeUpper, this.rightEyeLower]);
    }

    necessaryPoints() {
        return ["leftLateralCanthus", "leftMedialCanthus", "leftEyeUpper", "leftEyeLower", "rightLateralCanthus", "rightMedialCanthus", "rightEyeUpper", "rightEyeLower"];
    }
}

class EyeColor extends Criteria {
    calculate() {
        this.leftIrisCoordinates = this.face.annotations.rightEyeIris;
        this.leftIrisWidth = this.leftIrisCoordinates[1][0] - this.leftIrisCoordinates[3][0];
        this.leftIrisHeight = this.leftIrisCoordinates[4][1] - this.leftIrisCoordinates[2][1];
        this.rightIrisCoordinates = this.face.annotations.leftEyeIris;
        this.rightIrisWidth = this.rightIrisCoordinates[3][0] - this.rightIrisCoordinates[1][0];
        this.rightIrisHeight = this.rightIrisCoordinates[4][1] - this.rightIrisCoordinates[2][1];
    }

    render() {
        return `<canvas height="0" width="0"></canvas><canvas height="0" width="0"></canvas>`;
    }

    ideal() {
        return "";
    }

    assess() {
        return "";
    }

    detect(image, [ctx0, ctx1]) {
        ctx0.canvas.width = this.leftIrisWidth;
        ctx0.canvas.height = this.leftIrisHeight;
        ctx0.drawImage(image, this.leftIrisCoordinates[3][0], this.leftIrisCoordinates[2][1], this.leftIrisWidth, this.leftIrisHeight, 0, 0, this.leftIrisWidth, this.leftIrisHeight);
        ctx1.canvas.width = this.rightIrisWidth;
        ctx1.canvas.height = this.rightIrisHeight;
        ctx1.drawImage(image, this.rightIrisCoordinates[1][0], this.rightIrisCoordinates[2][1], this.rightIrisWidth, this.rightIrisHeight, 0, 0, this.rightIrisWidth, this.rightIrisHeight);
    }

    necessaryPoints() {
        return [];
    }
}

function distance([ax, ay], [bx, by]) {
    return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

class Fn {
    constructor(a, b) {
        // y = ax + b
        this.a = a;
        this.b = b;

        this.slope = this.a;
        this.yintersect = this.b;
    }

    static fromTwoPoints([ax, ay], [bx, by]) {
        // y = (ay / by) / (ax - bx) * (x - ax) + ay
        return Fn.fromOffset((ay - by) / (ax - bx), ax, ay);
    }

    static fromOffset(a, b, c) {
        // y = a * (x - b) + c
        return new Fn(a, c - (a * b));
    }

    getY(x) {
        return this.a * x + this.b;
    }

    perpendicular([x, y]) {
        return Fn.fromOffset((-1) * (1 / this.a), x, y);
    }

    parallel([x, y]) {
        return Fn.fromOffset(this.a, x, y);
    }

    intersect(fn) {
        let x = (fn.b - this.b) / (this.a - fn.a);
        return [x, this.getY(x)];
    }

    draw(ctx, color) {
        let points = [];
        for (let i = 0; i < ctx.canvas.width; i += 1) {
            points.push([i, this.getY(i)]);
        }
        draw(ctx, color || "red", points);
    }
}

function round(n, digits) {
    digits = 10 ** (isNaN(digits) ? 2 : digits);
    return Math.round(n * digits) / digits;
}

function assess(value, idealLower, idealUpper, deviation, deviatingLow, deviatingHigh) {
    function renderMultiplier(multiplier) {
        if (multiplier === 0) {
            return "slightly too";
        } else if (multiplier === 1) {
            return "noticeably";
        } else if (multiplier === 2) {
            return "significantly too";
        } else if (multiplier === 3) {
            return "horribly";
        } else {
            return "extremely";
        }
    }

    function calculate(value, idealLower, idealUpper, deviation) {

        if (idealUpper !== undefined && idealLower !== undefined) {
            if (idealUpper >= value && idealLower <= value) {
                return {
                    type: "perfect",
                };
            }
        } else if (((idealUpper && !idealLower) && value <= idealUpper) || ((!idealUpper && idealLower) && value >= idealLower)) {
            return {
                type: "perfect",
            };
        }

        if (value < idealLower) {
            let multiplier = 0;
            while ((value += deviation) < idealLower) {
                multiplier++;
            }
            return {
                type: "low",
                multiplier: Math.min(multiplier, 4),
                text: renderMultiplier(multiplier),
            };
        }

        if (value > idealUpper) {
            let multiplier = 0;
            while ((value -= deviation) > idealUpper) {
                multiplier++;
            }
            return {
                type: "high",
                multiplier: Math.min(multiplier, 4),
                text: renderMultiplier(multiplier),
            };
        }

    }

    let { type, multiplier, text } = calculate(value, idealLower, idealUpper, deviation);

    if (type === "perfect") {
        return `<span class="perfect">perfect</span>`;
    } else if (type === "low") {
        return `<span class="deviation-${multiplier}">${text} ${deviatingLow}</span>`;
    } else if (type === "high") {
        return `<span class="deviation-${multiplier}">${text} ${deviatingHigh}</span>`;
    }
}

function draw(ctx, color, points) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    let current = points[0];

    var fontBase = ctx.canvas.width * 0.6;
    var fontSize = 20;

    var ratio = fontSize / fontBase;
    var size = ctx.canvas.width * ratio;
    if (ctx.canvas.width > 600) {
        ctx.font = size + 'px sans-serif';
    } else {
        ctx.font = '18px sans-serif';
    }

    ctx.globalAlpha = .50;
    ctx.fillStyle = 'white'
    var text = "Mogging"
    let cw = ctx.canvas.width;
    let ch = ctx.canvas.height;
    var textWidth = ctx.measureText(text).width;
    ctx.fillStyle = 'gray'
    ctx.fillText(text, cw - textWidth - 10, ch - 20);
    ctx.fillStyle = 'white'
    ctx.fillText(text, cw - textWidth - 10 + 2, ch - 20 + 2);

    for (let i of points.concat([points[0]])) {
        let [x, y] = i;

        ctx.beginPath();
        ctx.moveTo(current[0], current[1]);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, ctx.arcRadius, 0, 2 * Math.PI);
        ctx.fill();

        current = i;
    }
}

