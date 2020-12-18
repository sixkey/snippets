function dnn(inputSize, hLayerSize, hLayerNumber, outputSize, values) {
    this.inputSize = inputSize;
    this.hLayerSize = hLayerSize;
    this.hLayerNumber = hLayerNumber;
    this.outputSize = outputSize;

    let shapeWeights = [];
    let shapeBiases = [];

    var h = inputSize;
    var w = outputSize;

    this.size = hLayerNumber + 1;

    for (var i = 0; i < hLayerNumber; i++) {
        w = hLayerSize;
        shapeWeights.push([h, w]);
        shapeBiases.push([1, w]);
        h = hLayerSize;
    }

    w = outputSize;
    shapeWeights.push([h, w]);
    shapeBiases.push([1, w]);

    if (values == undefined) {
        this.weights = SPTensors.random(shapeWeights, -1, 1);
        this.biases = SPTensors.random(shapeBiases, -1, 1);
    } else {
        let wSize = SPTensors.getSize(shapeWeights);
        this.weights = new VariableTensor(shapeWeights, values.slice(0, wSize));
        this.biases = new VariableTensor(shapeBiases, values.slice(wSize));
    }
}

dnn.prototype.toString = function () {
    return (
        "WEIGHTS\n" +
        this.weights.toString() +
        "BIASES\n" +
        this.biases.toString()
    );
};

dnn.prototype.vectorize = function () {
    return SPTensors.concat(
        [this.weights, this.biases],
        [this.weights.size + this.biases.size]
    );
};

dnn.prototype.forward = function (input) {
    var temp = input;

    for (var layer = 0; layer < this.size; layer++) {
        temp = SPTensors.dot(temp, this.weights, [], [layer])
            .add(this.biases.subTensor([layer]))
            .apply(SPMath.sigmoid);
    }

    return temp;
};

dnn.prototype.mutate = function () {
    var child = new dnn(
        this.inputSize,
        this.hLayerSize,
        this.hLayerNumber,
        this.outputSize
    );
    child.weights = SPTensors.add(
        this.weights,
        SPTensors.randomLike(this.weights, -0.25, 0.25)
    );
    child.biases = SPTensors.add(
        this.biases,
        SPTensors.randomLike(this.biases, -0.25, 0.25)
    );

    return child;
};
