class Project {
  constructor(
    name,
    show = true,
    type = 'project',
    id = new Date().getTime() + '' + Math.round(Math.random()*100),
    ){
    this.name = name; 
    this._show = show;
    this._type = type;
    this._id = id;
    this._dataPool = new Array();
  }

  set type(value){
    this._type = value;
  }

  get type(){
    return this._type;
  }

  get id() {
    return this._id;
  }

  get dataPool(){
    return this._dataPool;
  }

  set show(value){
    this._dataPool.forEach(item => item.show = value);
    this._show = value;
  }

  get show(){
    return this._show;
  }

  selectedNode(value){
    if(value && this._show){
      window.jsTreeObj.select_node(this._id);
    }else{
      window.jsTreeObj.deselect_node(this._id);
    }
  }

  createNode(){
    window.jsTreeObj.create_node('#', {
      'id' : this._id,
      'type': this._type,
      'text' : this.name,
      'state' : {'opened': true, 'selected': this._show},
      'content' : this
    });
  }

  getData(id){
    let data_copy = null;    
    this._dataPool.forEach(data => {
      if(data.id === id) data_copy = data;
    })
    return data_copy;
  }
}

class Entity{
  constructor(
    name,
    parent = null,
    origin = 'file',
    show = true,
    type = 'entity',
    id = new Date().getTime() + '' + Math.round(Math.random()*100000),
    ) {  
    this.name = name;
    this._show = show;
    this._id = id;
    this._type = type;
    this._parent = parent;
    this._origin = origin;
    this._entitys = new Array();
  }

  get parent(){
    return this._parent;
  }

  set parent(value){
    this._parent = value;
  }

  set origin(value){
    this._origin = value;
  }

  get origin(){
    return this._origin;
  } 

  get id(){
    return this._id;
  }

  get type(){
    return this._type;
  }

  get entitys(){
    return this._entitys;
  }

  set entitys(value){
    this._entitys = value;
  }

  set show(value){
    this._entitys.forEach(item => item.show = value);
    this._show = value;
  }

  get show(){
    return this._show;
  }

  selectedNode(value){
    if(value && this._show){
      window.jsTreeObj.select_node(this._id);
    }else{
      window.jsTreeObj.deselect_node(this._id);
    }
  }

  createNode(){
    if(this._parent === null) throw {state : 'error',message : '缺少父节点数据'};
    
    window.jsTreeObj.create_node(this._parent._id, {
      'id' : this._id,
      'type': this._type,
      'parent': this._parent._id,
      'text' : this.name,
      'state' : {'opened': false,'selected': this._show},
      'content' : this
    });
  }
}

class Polygon{
  constructor(
    name,
    entity,
    parent = null,
    show = true,
    type = 'polygon',
    id = new Date().getTime() + '' + Math.round(Math.random()*100000),
    ) {  
    this.name = name;
    this._show = show;
    this._id = id;
    this._type = type;
    this._parent = parent;
    this._entity = entity;
    this._acreage = null;
  }

  get id(){
    return this._id;
  }

  get type(){
    return this._type;
  }

  get entity(){
    return this._entity;
  }

  get parent(){
    return this._parent;
  }

  set parent(value){
    this._parent = value;
  }

  get acreage(){
    return this._acreage;
  }

  set acreage(value){
    this._acreage = value;
  }

  set show(value){
    this._entity.show = value;
    this._show = value;
  }

  get show(){
    return this._show;
  }

  selectedNode(value){
    if(value && this._show){
      window.jsTreeObj.select_node(this._id);
    }else{
      window.jsTreeObj.deselect_node(this._id);
    }
  }

  createNode(){
    if(this._parent === null) throw {state : 'error',message : '缺少父节点数据'};
    window.jsTreeObj.create_node(this._parent._id, {
      'id' : this._id,
      'type': this._type,
      'parent': this._parent._id,
      'text' : this.name,
      'state' : {'opened':false,'selected':this._show},
      'content' : this
    });
  }
}

class Polyline{
  constructor(
    name,
    entity,
    parent = null,
    show = true,
    type = 'polyline',
    id = new Date().getTime() + '' + Math.round(Math.random()*100000),
    ) {  
    this.name = name;
    this._show = show;
    this._id = id;
    this._type = type;
    this._parent = parent;
    this._entity = entity;
    this._length = null;
  }

  get id(){
    return this._id;
  }

  get type(){
    return this._type;
  }

  get entity(){
    return this._entity;
  }

  get parent(){
    return this._parent;
  }

  set parent(value){
    this._parent = value;
  }

  get length(){
    return this._length;
  }

  set length(value){
    this._length = value;
  }

  set show(value){
    this._entity.show = value;
    this._show = value;
  }

  get show(){
    return this._show;
  }

  selectedNode(value){
    if(value && this._show){
      window.jsTreeObj.select_node(this._id);
    }else{
      window.jsTreeObj.deselect_node(this._id);
    }
  }

  createNode(){
    if(this._parent === null) throw {state : 'error',message : '缺少父节点数据'};
    window.jsTreeObj.create_node(this._parent._id, {
      'id' : this._id,
      'type': this._type,
      'parent': this._parent._id,
      'text' : this.name,
      'state' : {'opened':false,'selected':this._show},
      'content' : this
    });
  }
}

class Point{
  constructor(
    name,
    entity,
    parent = null,
    show = true,
    type = 'point',
    id = new Date().getTime() + '' + Math.round(Math.random()*100000),
    ) {
    this.name = name;
    this._show = show;
    this._id = id;
    this._type = type;
    this._parent = parent;
    this._entity = entity;
  }

  get id(){
    return this._id;
  }

  get type(){
    return this._type;
  }

  get entity(){
    return this._entity;
  }

  get parent(){
    return this._parent;
  }

  set parent(value){
    this._parent = value;
  }

  set show(value){
    this._entity.show = value;
    this._show = value;
  }

  get show(){
    return this._show;
  }

  selectedNode(value){
    if(value && this._show){
      window.jsTreeObj.select_node(this._id);
    }else{
      window.jsTreeObj.deselect_node(this._id);
    }
  }

  createNode(){
    if(this._parent === null) throw {state : 'error',message : '缺少父节点数据'};
    window.jsTreeObj.create_node(this._parent._id, {
      'id' : this._id,
      'type': this._type,
      'parent': this._parent._id,
      'text' : this.name,
      'state' : {'opened':false,'selected':this._show},
      'content' : this
    });
  }
}

class Primitive{
  constructor(
    name,
    parent = null,
    path = null,
    show = true,
    type = 'primitive',
    id = new Date().getTime() + '' + Math.round(Math.random()*100000),
    ) {
    this.name = name;
    this._show = show;
    this._id = id;
    this._type = type;
    this._parent = parent;
    this._path = path;
    this._primitives = new Array();
  }

  get parent(){
    return this._parent;
  }

  set parent(value){
    this._parent = value;
  }

  get id(){
    return this._id;
  }

  get type(){
    return this._type;
  }

  set path(value){
    this._path = value;
  }

  get path(){
    return this._path;
  }

  get primitives(){
    return this._primitives;
  }

  set show(value){
    this._primitives.forEach(item => item.show = value);
    this._show = value;
  }

  get show(){
    return this._show;
  }

  selectedNode(value){
    if(value && this._show){
      window.jsTreeObj.select_node(this._id);
    }else{
      window.jsTreeObj.deselect_node(this._id);
    }
  }

  createNode(){
    if(this._parent === null) throw {state : 'error',message : '缺少父节点数据'};
    window.jsTreeObj.create_node(this._parent._id, {
      'id' : this._id,
      'type': this._type,
      'parent': this._parent._id,
      'text' : this.name,
      'state' : {'opened': false,'selected':this._show},
      'content' : this
    });
  }
}

class Tile{
  constructor(
    name,
    primitive,
    parent = null,
    show = true,
    type = 'tile',
    id = new Date().getTime() + '' + Math.round(Math.random()*100000),
    ) {  
    this.name = name;
    this._show = show;
    this._id = id;
    this._type = type;
    this._parent = parent;
    this._primitive = primitive;
    this._debug = null;
  }
  get id(){
    return this._id;
  }

  get type(){
    return this._type;
  }

  get primitive(){
    return this._primitive;
  }

  get parent(){
    return this._parent;
  }

  set parent(value){
    this._parent = value;
  }

  get debug(){
    return this._debug;
  }

  set debug(value){
    this._debug = value;
  }

  set show(value){
    this._primitive.show = value;
    this._show = value;
  }

  get show(){
    return this._show;
  }

  selectedNode(value){
    if(value && this._show){
      window.jsTreeObj.select_node(this._id);
    }else{
      window.jsTreeObj.deselect_node(this._id);
    }
  }

  createNode(){
    if(this._parent === null) throw {state : 'error',message : '缺少父节点数据'};
    window.jsTreeObj.create_node(this._parent._id, {
      'id' : this._id,
      'type': this._type,
      'parent': this._parent._id,
      'text' : this.name,
      'state' : {'opened':false,'selected':this._show},
      'content' : this
    });
  }
}

export {Project, Entity, Polygon, Polyline, Point, Primitive, Tile};