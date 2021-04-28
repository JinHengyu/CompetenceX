// 所有的全局变量都放在这里

const path = require("path");
const crypto = require("crypto");

const server = {
  domain: "localhost",
  ip: "127.0.0.1",
};

const mongo = {
  port: 27017,
  url: "mongodb://127.0.0.1:27017/",
  poolSize: 10,
  backup_path: path.join(__dirname, "./mongo_backup/"),
  // 备份防抖:5分钟
  backup_interval: 5 * 60 * 1000,
  backup_last: Date.now(),
};

const session = {
  secret: "CompetenceX",
  key: "CompetenceX",
  // 基数:1 day
  ttl: 1 * 86400 * 1000,
};

// sent to frontend
const app = {
  protocol: "https",
  port: 443,
  name: "CompetenceX",
  version: "4.2.6",
  key: path.join(__dirname, "./ssl/localhost.key"),
  cert: path.join(__dirname, "./ssl/localhost.crt"),
  author: "jinhengyu666@qq.com",
  author_blog: "https://jimmy.blog.csdn.net/",
  admin: "jinhengyu666@gmail.com",
  DBs: [],
};

// 前端资源
const my = {
  wiki: "/get/public/my4.2.6/wiki.mp4",
  "main.js": "/get/public/my4.2.6/main.js",
  "async.js": "/get/public/my4.2.6/async.js",
  "main.css": "/get/public/my4.2.6/main.css",
  "setting.js": "/get/public/my4.2.6/setting.js",
  favicon: "/get/public/img/favicon_red.png",
  "ag-grid": "/get/public/ag-grid/ag-grid-enterprise.min@22.0.0.js",
  "json-editor": "/get/public/jsoneditor/jsoneditor.min@1.3.5.js",
};

const radar = {
  segment: 8,
  service: "person_skill",
  max: 5,
};

// schema of log,human,skill

// 前端console.table
const log = {
  // 可能的字段
  method: "http method",
  ip: "request.ip",
  user: "user的_id",
  human: "human的_id",
  role: "",
  skill: "skill的_id",
  type: "",
  info: "备注信息, 比如login, debug的输入输出",
  // 必须字段: 用于排序
  _id: Date.now(),
  // mac和ttl二选一
  // max: 300,
  ttl: 40 * 86400 * 1000,
  // 一次取出的数量
  $limit: 500,
};

module.exports = {
  session,
  server,
  mongo,
  app,
  my,
  radar,
  log,

  levelMap: {
    human: 1,
    locked: 3,
    hyper: 5,
    root: 7,
  },

  sha1(text) {
    let generator = crypto.createHash("sha1");
    generator.update(text);
    return generator.digest("hex");
  },
};
