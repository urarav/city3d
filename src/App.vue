<template>
  <city/>
</template>

<script>
import City from "@/components/City";

export default {
  name: 'App',
  components: {
    City
  }
}
</script>

<style>
html,body,#app,.el-container,#container{
  overflow: hidden;
  /*设置内部填充为0，几个布局元素之间没有间距*/
  padding: 0;
  /*外部间距也是如此设置*/
  margin: 0;
  /*统一设置高度为100%*/
  height: 100%;
}
</style>
