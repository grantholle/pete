<template>
  <div class="inline-block relative w-full mb-3">
    <select v-model="internalValue" class="input-control">
      <option v-for="option in options" :key="option">{{ option }}</option>
    </select>
    <div class="pointer-events-none absolute pin-y pin-r flex items-center px-2 text-grey-darker">
      <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
    </div>
  </div>
</template>

<script>
export default {
  name: 'pete-select',

  props: ['value', 'options'],

  data () {
    return {
      internalValue: ''
    }
  },

  created () {
    this.internalValue = this.value
  },

  watch: {
    value (val) {
      this.internalValue = val
    },

    internalValue (val) {
      this.$emit('input', val)
    }
  }
}
</script>
