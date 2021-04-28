const Transform = require('stream').Transform;


module.exports = class extends Transform {
    constructor() {
        super({
            // 写入方向
            writableObjectMode: false,
            // 读出方向
            readableObjectMode: true,
        })
        this.queue = ''
    }
    
    _transform(chunk, encoding, next) {
        this.queue += chunk.toString();

        const lines = this.queue.split('\n')

        this.queue = lines.pop();

        lines.forEach(line => this.push(line));

        // this.push或next二选一传递chunk
        next();
    }
    // 最后一个chunk结束后
    _flush(callback) {
        this.queue.split('\n').forEach(line => {
            this.push(line)
        })
        callback();
    }
}