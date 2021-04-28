// 所有的异步方法封装: 网络层异步和用户异步
// 统一返回promise



// 处理用户的异步操作
(function initUserAsync() {

    window.openLoginEditor = async () => {
        await new Promise((resolve, reject) => {
            if (dom.MDCDrawer.open) {
                dom.MDCDrawer.open = false;
                setTimeout(resolve, 400);
            } else resolve();
        });

        dom.login.open();
        const user = JSON.parse(localStorage.getItem('user')) || {};
        dom._id.value = user._id || '';
        dom._pwd.value = user._pwd || '';
        dom._db.value = user._db || '';

        return new Promise((res, rej) => {
            document.querySelector('#login button[data-mdc-dialog-action="accept"]').onclick = event => {
                const user = {
                    _id: dom._id.value.toLowerCase(),
                    _pwd: dom._pwd.value,
                    _db: dom._db.value,
                };
                localStorage.setItem('user', JSON.stringify(user));
                res(user);
            };
        })

    };



    //   add human / set human
    window.openHumanEditor = async ({
        // 是否显示'reset pwd'按钮
        setting = false,
        human = focus.human,
        title = '',
        disabledFields = ['root._id', 'root._pwd', 'root._lv'],
        // 字段编辑控件一定出现, 且不能为空(select没有空选项)
        required = [],
    }) => {

        await new Promise((resolve, reject) => {
            if (dom.MDCDrawer.open) {
                dom.MDCDrawer.open = false;
                setTimeout(resolve, 400);
            } else resolve();
        });

        const settingButtons = document.querySelectorAll('#editor [data-mdc-dialog-action="setting"]');
        if (setting) settingButtons.forEach(b => b.style.visibility = 'visible');
        else settingButtons.forEach(b => b.style.visibility = 'hidden');

        dom.editor.open();
        document.querySelector('#editor .mdc-dialog__title').innerHTML = title;
        const container = document.querySelector('#editor .mdc-dialog__content');
        container.innerHTML = '';
        const editor = new JSONEditor(container, {
            disable_collapse: true,
            disable_edit_json: true,
            disable_properties: true,
            schema: {
                "title": "Pls fillout REQUIRED fields:",
                "type": "object",
                required,
                "properties": {
                    "_id": {
                        title: 'Email(ID):',
                        "type": "string",
                        "options": {
                            "inputAttributes": {
                                "placeholder": "Email (required)",
                            }
                        }
                    },
                    "_pwd": {
                        title: 'Encrypted Password:',
                        "type": "string"
                    },
                    "_info": {
                        title: 'Something about this person:',
                        "type": "string",
                        format: 'textarea',
                        "options": {
                            "inputAttributes": {
                                "placeholder": "department or something (optional)",
                            }
                        }
                    },
                    "_lv": {
                        "type": "string",
                        title: 'level',
                        "enum": [
                            "human",
                            "locked",
                            "hyper",
                            "root"
                        ]
                    },

                    "_role": {
                        title: `Person's Role:`,
                        "enum": window.user._roleList,
                        "type": "string",
                    },
                },
            },

        });
        editor.setValue(Object.keys(human).filter(k => k[0] === '_').reduce((digestHuman, key) => {
            digestHuman[key] = human[key];
            return digestHuman;
        }, {}));
        disabledFields.forEach(field => {
            const subEditor = editor.getEditor(field);
            if (subEditor) subEditor.disable();
        });

        return new Promise((res, rej) => {

            document.querySelector('#editor button[data-mdc-dialog-action="accept"]').onclick = () => {
                const human = editor.getValue();
                human._id = human._id.toLowerCase();
                Object.keys(human).forEach(k => human[k] = human[k].trim());
                res(human);
                editor.destroy();
            };
        })

    };





    // 负责从打开json编辑器开始, 到用户点击OK结束, resolve编辑后的json对象
    // add skill / set skill
    window.openSkillEditor = async ({
        skill = focus.skill,
        title = '',
        disabledFields = ['root._id'],
        required = []
    }) => {
        await new Promise((resolve, reject) => {
            if (dom.MDCDrawer.open) {
                dom.MDCDrawer.open = false;
                setTimeout(resolve, 400);
            } else resolve();
        });
        document.querySelectorAll('#editor [data-mdc-dialog-action="setting"]').forEach(b => b.style.visibility = 'hidden');
        dom.editor.open();
        document.querySelector('#editor .mdc-dialog__title').innerHTML = title;
        const container = document.querySelector('#editor .mdc-dialog__content');
        container.innerHTML = '';
        const editor = new JSONEditor(container, {
            disable_collapse: true,
            disable_edit_json: true,
            disable_properties: true,
            schema: {
                "title": "Pls fillout REQUIRED fields:",
                "type": "object",
                required,
                "properties": {
                    "_id": {
                        title: 'Skill Name:',
                        "type": "string",
                        "options": {
                            "inputAttributes": {
                                "placeholder": "(required)",
                            }
                        }
                    },
                    "_type": {
                        title: 'Skill-Type:',
                        "type": "string",
                        enum: window.user._typeList
                    },
                    _sub_type: {
                        title: 'Skill-SubType:',
                        type: 'string',
                        "options": {
                            "inputAttributes": {
                                "placeholder": "(optional)",
                            }
                        }
                    },
                    "_info": {
                        title: 'About:',
                        "type": "string",
                        format: 'textarea',
                        "options": {
                            "inputAttributes": {
                                "placeholder": "description about this skill (optional)",
                            }
                        }
                    },
                },
            },

        });
        editor.setValue(skill);
        disabledFields.forEach(field => {
            const subEditor = editor.getEditor(field);
            if (subEditor) subEditor.disable();
        });
        return new Promise((res, rej) => {
            document.querySelector('#editor button[data-mdc-dialog-action="accept"]').onclick = () => {
                const skill = editor.getValue();
                Object.keys(skill).forEach(k => skill[k] = skill[k].trim());
                res(skill);
                editor.destroy();
            }
        });

    };




    // 不需要role editor


})();












// curd:只负责网络层面的处理(包括progress bar)
// 每种curd方法的http head,body都不一样, 所以不好合并成myFetch
(function initCurdAsync() {

    // 明文传输密码:https无所畏惧
    const login = (user = {}) => new Promise((res, rej) => {
        dom.progress.classList.remove('mdc-linear-progress--closed');
        fetch('/add/login', {
            body: JSON.stringify(user),
            // 默认都是POST, 需要区分的时候再使用method
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            credentials: 'include'
        }).then(r => {
            if (r.ok) return r.json();
            else return new Promise((res, rej) => r.json().then(msg => rej(new Error(msg))));
        }).then(user => {
            dom.progress.classList.add('mdc-linear-progress--closed');
            res(Object.assign({ _roleList: [], _typeList: [] }, user));
        }).catch(err => {
            rej(err);
            console.log(err.message);
            dom.progress.classList.add('mdc-linear-progress--closed');
        });

    });



    // filteredAll
    const getFilteredAll = () => new Promise((res, rej) => {
        dom.progress.classList.remove('mdc-linear-progress--closed');
        fetch('/get/filteredAll', {
            method: 'GET',
            credentials: 'include'
        }).then(r => {
            if (r.ok) return r.json();
            else return new Promise((res, rej) => r.json().then(msg => rej(new Error(msg))));
        }).then(data => {
            dom.progress.classList.add('mdc-linear-progress--closed');
            res(data);
        }).catch(err => {
            rej(err);
            dom.progress.classList.add('mdc-linear-progress--closed');
            console.log(err.message);
        });
    });


    const debug = input => new Promise((res, rej) => {
        dom.progress.classList.remove('mdc-linear-progress--closed');
        fetch('/exe/debug', {
            method: 'POST',
            body: input.toString(),
            credentials: 'include',
            headers: new Headers({
                'Content-Type': 'text/plain'
            })
        }).then(r => {
            // 返回一个流(promise)
            if (r.ok) return r.json();
            else return new Promise((res, rej) => r.json().then(msg => rej(new Error(msg))));
        }).then(output => {
            dom.progress.classList.add('mdc-linear-progress--closed');
            res(output);
        }).catch(err => {
            dom.progress.classList.add('mdc-linear-progress--closed');
            rej(err);
            console.log(err.message);
        });


    });



    // 下载并在console中打印log信息
    async function log() {
        try {
            dom.progress.classList.remove('mdc-linear-progress--closed');
            r = await fetch('/get/log', {
                method: 'GET',
                credentials: 'include'
            })

            ndjson = await r.text();

            // 此时ndjson是一串错误文本
            if (!r.ok) throw ndjson

            // }).then(list => {

            dom.progress.classList.add('mdc-linear-progress--closed');
            return ndjson.trim().split('\n').map(line => JSON.parse(line));
        } catch (err) {
            dom.progress.classList.add('mdc-linear-progress--closed');
            console.log(err.message || err);
            throw (err);
        };
    };



    // 接收残缺的human对象
    const setHuman = human => new Promise((res, rej) => {

        dom.progress.classList.remove('mdc-linear-progress--closed');
        fetch('/set/human', {
            method: 'PATCH',
            body: JSON.stringify(human),
            credentials: 'include',
            headers: new Headers({
                'Content-Type': 'application/json'
            })
        }).then(r => {
            if (r.ok) return r.json();
            else return new Promise((res, rej) => r.json().then(msg => rej(new Error(msg))));
        }).then(human => {
            dom.progress.classList.add('mdc-linear-progress--closed');
            res(human);
        }).catch(err => {
            rej(err);
            dom.progress.classList.add('mdc-linear-progress--closed');
            console.log(err.message);
        });
    });



    const dropHuman = human => new Promise((res, rej) => {
        dom.progress.classList.remove('mdc-linear-progress--closed');
        fetch('/drop/human', {
            method: 'DELETE',
            body: JSON.stringify(human),
            credentials: 'include',
            headers: new Headers({
                'Content-Type': 'application/json'
            })
        }).then(r => {
            if (r.ok) return r.json();
            else return new Promise((res, rej) => r.json().then(msg => rej(new Error(msg))));
        }).then(() => {
            dom.progress.classList.add('mdc-linear-progress--closed');
            res(human);
        }).catch(err => {
            rej(err);
            dom.progress.classList.add('mdc-linear-progress--closed');
            console.log(err.message);
        });
    });





    const dropSkill = skill => new Promise((res, rej) => {
        dom.progress.classList.remove('mdc-linear-progress--closed');
        fetch('/drop/skill', {
            method: 'DELETE',
            body: JSON.stringify(skill),
            credentials: 'include',
            headers: new Headers({
                'Content-Type': 'application/json'
            })
        }).then(r => {
            if (r.ok) return r.json();
            else return new Promise((res, rej) => r.json().then(msg => rej(new Error(msg))));
        }).then(skill => {
            dom.progress.classList.add('mdc-linear-progress--closed');
            res(skill);
        }).catch(err => {
            rej(err);
            dom.progress.classList.add('mdc-linear-progress--closed');
            console.log(err.message);
        });
    });





    const addHuman = human => new Promise((res, rej) => {
        dom.progress.classList.remove('mdc-linear-progress--closed');
        fetch('/add/human', {
            method: 'POST',
            body: JSON.stringify(human),
            credentials: 'include',
            headers: new Headers({
                'Content-Type': 'application/json'
            })
        }).then(r => {
            if (r.ok) return r.json();
            else return new Promise((res, rej) => r.json().then(msg => rej(new Error(msg))));
        }).then(human => {
            dom.progress.classList.add('mdc-linear-progress--closed');
            res(human);
        }).catch(err => {
            rej(err);
            dom.progress.classList.add('mdc-linear-progress--closed');
            console.log(err.message);
        });
    });




    const addSkill = skill => new Promise((res, rej) => {
        dom.progress.classList.remove('mdc-linear-progress--closed');
        fetch('/add/skill', {
            method: 'POST',
            body: JSON.stringify(skill),
            credentials: 'include',
            headers: new Headers({
                'Content-Type': 'application/json'
            })
        }).then(r => {
            if (r.ok) return r.json();
            else return new Promise((res, rej) => r.json().then(msg => rej(new Error(msg))));
        }).then(skill => {
            dom.progress.classList.add('mdc-linear-progress--closed');
            res(skill);
        }).catch(err => {
            rej(err);
            dom.progress.classList.add('mdc-linear-progress--closed');
            console.log(err.message);
        });
    });



    const setSkill = skill => new Promise((res, rej) => {
        dom.progress.classList.remove('mdc-linear-progress--closed');
        fetch('/set/skill', {
            method: 'PATCH',
            body: JSON.stringify(skill),
            credentials: 'include',
            headers: new Headers({
                'Content-Type': 'application/json'
            })
        }).then(r => {
            if (r.ok) return r.json();
            else return new Promise((res, rej) => r.json().then(msg => rej(new Error(msg))));
        }).then(skill => {
            dom.progress.classList.add('mdc-linear-progress--closed');
            res(skill);
        }).catch(err => {
            rej(err);
            dom.progress.classList.add('mdc-linear-progress--closed');
            console.log(err.message);
        });
    });






    // 下面3个是setting.ejs里用的


    const getProjectedAll = () => new Promise((res, rej) => {
        dom.progress.classList.remove('mdc-linear-progress--closed');
        fetch('/get/projectedAll', {
            method: 'GET',
            credentials: 'include'
        }).then(r => {
            if (r.ok) return r.json();
            else return new Promise((res, rej) => r.json().then(msg => rej(new Error(msg))));
        }).then(data => {
            dom.progress.classList.add('mdc-linear-progress--closed');
            res(data);
        }).catch(err => {
            rej(err);
            dom.progress.classList.add('mdc-linear-progress--closed');
            console.log(err.message);
        });
    });

    const
        copyAccount = user => new Promise((res, rej) => {
            dom.progress.classList.remove('mdc-linear-progress--closed');
            fetch('/set/copyAccount', {
                method: 'PATCH',
                body: JSON.stringify(user),
                credentials: 'include',
                headers: new Headers({
                    'Content-Type': 'application/json'
                })
            }).then(r => {
                if (r.ok) return r.json();
                else return new Promise((res, rej) => r.json().then(msg => rej(new Error(msg))));
            }).then(user => {
                dom.progress.classList.add('mdc-linear-progress--closed');
                res(user);
            }).catch(err => {
                rej(err);
                dom.progress.classList.add('mdc-linear-progress--closed');
                console.log(err.message);
            });
        })




    const replaceUnit = async function (unit) {
        try {
            dom.progress.classList.remove('mdc-linear-progress--closed');
            const r = await fetch('/replace/unit', {
                method: 'PUT',
                body: JSON.stringify(unit),
                credentials: 'include',
                headers: new Headers({
                    'Content-Type': 'application/json'
                }),
            });
            const response = await r.json();
            if (!r.ok) throw new Error(response);
            else return response;
        } catch (err) {
            console.log(err.message);
            throw err;
        } finally {
            dom.progress.classList.add('mdc-linear-progress--closed');
        }
    }


    const dropUnit = async function (unit) {
        try {
            dom.progress.classList.remove('mdc-linear-progress--closed');
            const r = await fetch('/drop/unit', {
                method: 'DELETE',
                body: JSON.stringify(unit),
                credentials: 'include',
                headers: new Headers({
                    'Content-Type': 'application/json'
                }),
            });
            const response = await r.json();
            if (!r.ok) throw new Error(response);
            else return response;
        } catch (err) {
            console.log(err.message);
            throw err;
        } finally {
            dom.progress.classList.add('mdc-linear-progress--closed');
        }
    }




    // window.api = {
    window.curd = {
        log,
        login,
        getProjectedAll,
        getFilteredAll,
        debug,

        addHuman,
        setHuman,
        dropHuman,

        addSkill,
        setSkill,
        dropSkill,

        copyAccount,

        replaceUnit,
        dropUnit,
    };


})();