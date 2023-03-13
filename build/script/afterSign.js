/*
 * @Version: 1.0
 * @Autor: wangrenhua
 * @Description: 
 * @Date: 2022-06-06 22:40:09
 * @FilePath: \Cosmos\build\script\afterSign.js
 * @LastEditTime: 2022-07-19 12:13:07
 */
const fs = require('fs')
const path = require('path');
const asar = require('asar');
const asarmor = require('asarmor');
const JavaScriptObfuscator = require('javascript-obfuscator');

//获取指定文件夹下的类型文件
function getFiles(dirpath, exclude){
    function getFiles_(dir, arr){
        const stat = fs.statSync(dir);
        if(stat.isDirectory()){
            const dirs = fs.readdirSync(dir);
            dirs.forEach(value => {
                let extname = path.extname(value);
                if(!exclude.includes(value) && !exclude.includes(extname)) getFiles_(path.join(dir,value), arr);
            })
        }else if(stat.isFile()){
            //文件
            arr.push(dir);
        }
    };
    let arrs = [];
    getFiles_(dirpath, arrs);
    return arrs;
}

exports.default = async ({appOutDir, packager}) => {
    try{
        const asarPath = path.join(packager.getResourcesDir(appOutDir), 'app.asar');
        
        let appPath = path.join(packager.getResourcesDir(appOutDir), 'app');
        if(fs.existsSync(asarPath)){
            //如果存在asar压缩包
            asar.extractAll(asarPath, appPath);
        }

        //替换文件类容
        let fileArrs = getFiles(appPath, ["node_modules", "public", ".css", ".html", ".md", ".json"]);
    
        for(let i = 0;i < fileArrs.length;i++){
            let con = fs.readFileSync(fileArrs[i],'utf8');
            let obfuscationResult = JavaScriptObfuscator.obfuscate(con,{
                compact: true,
                debugProtection: true,
                disableConsoleOutput: true,
                numbersToExpressions: true,
                simplify: true,
                stringArrayShuffle: true,
                splitStrings: true,
                stringArrayThreshold: 1
            });
            fs.writeFileSync(fileArrs[i], obfuscationResult.getObfuscatedCode());
        }
    
        console.log('asar content replacement completed.');
        if(fs.existsSync(asarPath)){
            fs.unlinkSync(asarPath);
            console.log('delete the original asar.');
        }
        await asar.createPackage(appPath, asarPath);
        fs.rmdirSync(appPath,{recursive:true});
        console.log('create new asar.');
    
        //防止被解压
        const archive = await asarmor.open(asarPath);
        archive.patch(); // apply default patches
        archive.patch(asarmor.createBloatPatch(1314));
        console.log(`applying asarmor patches to ${asarPath}`);
        await archive.write(asarPath);
    }catch(err){
        console.error(err);
    }
}