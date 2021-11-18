<template>
  <city/>
</template>

<script>
import City from "@/components/City"

export default {
  name: 'App',
  components: {
    City
  }
}
</script>

<style lang="less">
html, body, #app, .el-container, #container {
  overflow: hidden;
  /*设置内部填充为0，几个布局元素之间没有间距*/
  padding: 0;
  /*外部间距也是如此设置*/
  margin: 0;
  /*统一设置高度为100%*/
  height: 100%;
}

.videoImg {
  background: url(../public/static/images/close.png) no-repeat;
  float: right;
  width: 24px;
  height: 24px;
}

#loadingHtml {
  &::before{
    content: '在做了在做了...';
    position: absolute;
    top: 400px;
    left: 400px;
  }
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: #f3f8ff;
  opacity: 1;
  filter: alpha(opacity=80);
  z-index: 1000;
}

.load {
  background: url("../public/static/images/load.png") no-repeat;
  width: 266px;
  height: 245px;
  position: absolute;
  left: 500px;
  top: 500px;
}
</style>
