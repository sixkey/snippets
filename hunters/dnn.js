function dnn(inputSize, hLayerSize, hLayerNumber, outputSize) {
    var weights = [];
    var biases = [];

    this.inputSize = inputSize;
    this.hLayerSize = hLayerSize;
    this.hLayerNumber = hLayerNumber;
    this.outputSize = outputSize;

    var h = inputSize;
    var w = outputSize;

    this.size = hLayerNumber + 1;

    for (var i = 0; i < hLayerNumber; i++) {
        w = hLayerSize;

        weights.push(SpoolTensors.random([h, w], -1, 1));
        biases.push(SpoolTensors.random([1, w], -1, 1));

        h = hLayerSize;
    }

    w = outputSize;
    weights.push(SpoolTensors.random([h, w], -1, 1));
    biases.push(SpoolTensors.random([1, w], -1, 1));

    this.weights = SpoolTensors.concat(weights);
    this.biases = SpoolTensors.concat(biases);
}

dnn.prototype.toString = function () {
    return (
        "WEIGHTS\n" +
        this.weights.toString() +
        "BIASES\n" +
        this.biases.toString()
    );
};

dnn.prototype.forward = function (input) {
    var temp = input;

    for (var layer = 0; layer < this.size; layer++) {
        temp = SpoolTensors.dot(temp, this.weights, [], [layer])
            .add(this.biases.subTensor([layer]))
            .apply(SpoolMath.sigmoid);
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
    child.weights = SpoolTensors.add(
        this.weights,
        SpoolTensors.randomLike(this.weights, -0.1, 0.1)
    );
    child.biases = SpoolTensors.add(
        this.biases,
        SpoolTensors.randomLike(this.biases, -0.1, 0.1)
    );

    return child;
};
