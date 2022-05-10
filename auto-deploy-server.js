const http = require("http")
const path = require("path")
const fs = require("fs")
const {
    execSync
} = require("child_process")

// 删除文件夹
const removeDir = (dir) => {
    try {
        let files = fs.readdirSync(dir);
        for (let i = 0; i < files.length; i++) {
            let newPath = path.join(dir, files[i])
            let stat = fs.statSync(newPath);
            if (stat.isDirectory()) {
                // 如果是文件夹就递归下去
                removeDir(newPath);
            } else {
                // 删除文件
                fs.unlinkSync(newPath);
            }
        }
        fs.rmdirSync(dir) // 如果文件夹是空的，就将自己删除掉
    } catch (e) {
        console.log(e);
    }
}

const resolvePost = req => new Promise(resolve => {
    let chunk = ''
    req.on('data', data => {
        chunk += data;
    })
    req.on('end', () => {
        resolve(JSON.parse(chunk))
    })
})

http.createServer(async (req, res) => {
    console.log('receive request')
    if (req.method === 'POST' && req.url === '/') {
        const data = await resolvePost(req);
        const projectDir = path.resolve(`./${data.repository.name}`);
        removeDir(projectDir);

        // 拉取仓库最新代码
        execSync(`git clone ${data.repository.git_ssh_url} ${projectDir}`,{
            stdio:'inherit',
        })

        // 创建docker镜像
        execSync(`docker build . -t ${data.repository.name}-image:latest`, {
            stdio: 'inherit',
            cwd: projectDir,
        })

        // 销毁<none>镜像
        execSync("docker rmi -f `docker images | grep '<none>' | awk '{print $3}'`", {
            stdio: 'inherit',
        })
        
        // 销毁 docker 容器
        execSync(`docker ps -a -f "name=^${data.repository.name}-container" --format="{{.Names}}" | xargs -r docker stop | xargs -r docker rm`, {
            stdio: 'inherit',
        })

        // 创建 docker 容器
        execSync(`docker run -d --name ${data.repository.name}-container ${data.repository.name}-image:latest`, {
            stdio: 'inherit',
        })

        console.log('deploy success!')
    }
    res.end('ok')
}).listen(3000, () => {
    console.log('server is ready')
})