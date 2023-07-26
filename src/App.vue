<script>

import { loadCoinList, subscribeToTicker, unsubscribeFromTicker } from './api';
import AddTicker from "@/components/AddTicker.vue";
import GraphDisplay from "@/components/GraphDisplay.vue";


const LS_KEY = 'cryptonomicon-list'
const ITEMS_PER_PAGE = 6

export default {
  name: "App",
  components: {GraphDisplay, AddTicker},

  data() {
    return {
      loader: true,

      coinList: {},
      hintList: [],

      ticker: "",
      tickers: [],

      graph: [],
      maxGraphElements: 1,

      selectedTicker: null,
      isError: false,
      filter: '',
      page: 1,
      hasNextPage: true
    }
  },

  created() {
    const windowData = Object.fromEntries(
        new URL(window.location).searchParams.entries()
    );

    const VALID_KEYS = ["filter", "page"];

    VALID_KEYS.forEach(key => {
      if (windowData[key]) {
        this[key] = windowData[key];
      }
    });

    const tickersData = localStorage.getItem(LS_KEY)
    if (tickersData) {
      this.tickers = JSON.parse(tickersData)

      this.tickers.forEach(ticker => {
        subscribeToTicker(ticker.name, newPrice =>
            this.updateTicker(ticker.name, newPrice),
            () =>
                ticker.isExist = false
        );
      })
    }

    this.getCoinList()
  },

  watch: {
    filter() {
      this.page = 1;
    },

    page() {
      this.graph = []
      this.selectedTicker = null

      window.history.pushState(
          null,
          document.title,
          `${window.location.pathname}?filter=${this.filter}&page=${this.page}`
      );
    },

    selectedTicker() {
      this.graph = []
      // this.$nextTick().then(this.calculateMaxGraphElements)
    },

    paginatedTickers() {
      if (this.paginatedTickers.length === 0 && this.page > 1) {
        this.page -= 1;
      }
    },

    tickers: {
      handler(newValue, oldValue) {
        localStorage.setItem(LS_KEY, JSON.stringify(newValue))
      },
      deep: true
    },

    pageStateOptions(value) {
      window.history.pushState(
          null,
          document.title,
          `${window.location.pathname}?filter=${value.filter}&page=${value.page}`
      );
    },

    ticker() {
      this.useHints()

      this.isError = false
    }
  },

  computed: {
    startIndex() {
      return (this.page - 1) * ITEMS_PER_PAGE
    },

    endIndex() {
      return this.page * ITEMS_PER_PAGE
    },

    filteredTickers() {
      return this.tickers.filter(
          ticker => ticker.name.includes(this.filter.toUpperCase())
      )
    },

    paginatedTickers() {
      return this.filteredTickers.slice(this.startIndex, this.endIndex)
    },

    hasNextPage() {
      return this.filteredTickers.length > this.endIndex;
    },

    normalizedGraph() {
      const maxValue = Math.max(...this.graph),
          minValue = Math.min(...this.graph)

      if(maxValue === minValue) {
        return this.graph.map(() => 50)
      }

      return this.graph.map(
          price => 5 + ((price - minValue) * 95) / (maxValue - minValue)
      )
    },

    pageStateOptions() {
      return {
        filter: this.filter,
        page: this.page
      };
    }
  },

  methods: {
    async getCoinList() {
      try {
        this.coinList = await loadCoinList()
      } catch (e) {

      } finally {
        this.loader = false;
      }
    },

    useHints() {
      if (!this.ticker.length) {
        this.hintList = []
        return
      }

      this.hintList = []
      let counter = 0

      for (const coinKey in this.coinList) {
        const coinFullName = this.coinList[coinKey].FullName.toUpperCase()

        if (coinFullName.includes(this.ticker.toUpperCase())) {
          this.hintList.push(coinKey)

          ++counter;
        }

        if (counter === 4) {
          break
        }
      }
    },

    updateTicker(tickerName, price) {
      this.tickers
          .filter(t => t.name === tickerName)
          .forEach(t => {
            if (t === this.selectedTicker) {
              this.graph.push(price);
              while (this.graph.length > this.maxGraphElements) {
                this.graph.shift();
              }
            }
            t.price = price;
          });
    },

    addTicker(ticker) {
      const upperCaseTicker = ticker.toUpperCase()

      if(!this.validateTicker(upperCaseTicker)) {
        return;
      }

      if(this.isError) {
        return
      }

      this.filter = ''


      let currentTicker = {
        'name': upperCaseTicker,
        'price': '-',
        'isExist': true
      };


      this.tickers.push(currentTicker)

      subscribeToTicker(currentTicker.name,
          (newPrice) =>
            this.updateTicker(currentTicker.name, newPrice),
          () => {
            this.tickers.find(tickersItem => tickersItem.name === currentTicker.name).isExist = false
          }
      );

      this.ticker = ''
      this.hintList = []
    },

    validateTicker(ticker) {
      if (this.tickers.find(tickersItem => tickersItem.name === ticker)) {
        this.isError = true

        return false
      } else {
        this.isError = false

        return true
      }
    },

    removeTicker(tickerToRemove) {
      this.tickers = this.tickers.filter(item => item !== tickerToRemove)

      unsubscribeFromTicker(tickerToRemove.name)

      this.selectedTicker = null
      this.graph = []
    },

    selectTicker(ticker) {
      if(!ticker.isExist) {
        return
      }

      this.graph = []
      this.selectedTicker = ticker
    },
  }
}

</script>

<template>
  <div class="container mx-auto flex flex-col items-center bg-gray-100 p-4 mt">
    <div class="container">
      <div class="w-full my-4">

        <div
            v-if="loader"
            class="fixed w-100 h-100 opacity-80 bg-purple-800 inset-0 z-50 flex items-center justify-center">
          <svg class="animate-spin -ml-1 mr-3 h-12 w-12 text-white" xmlns="http://www.w3.org/2000/svg" fill="none"
               viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <div class="container">

          <add-ticker
              @add-ticker="addTicker"
              v-model:ticker="ticker"
              :hint-list="hintList"
              :is-error="isError"
          />

          <template v-if="tickers.length">
            <hr class="w-full border-t border-gray-600 my-4"/>

            <div class="flex gap-5">
              <button
                  v-if="page > 1"
                  @click="this.page--"
                  class="my-4 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Назад
              </button>
              <button
                  v-if="hasNextPage"
                  @click="this.page++"
                  class="my-4 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Вперед
              </button>
            </div>

            <div>
              Фильтр:
              <div class="mt-1 relative rounded-md shadow-md">
                <input
                    v-model="filter"
                    type="text"
                    class="block w-full pr-10 border-gray-300 text-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
                />
              </div>
            </div>

            <hr class="w-full border-t border-gray-600 my-4"/>
            <dl class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div
                  class="overflow-hidden shadow rounded-lg border-purple-800 border-solid cursor-pointer"
                  v-for="item in paginatedTickers"
                  :key="item.name"
                  :class="{
                    'border-4': selectedTicker === item,
                    'bg-white': item.isExist,
                    'bg-red-500': !item.isExist
                  }"
                  @click="selectTicker(item)"
              >
                <div class="px-4 py-5 sm:p-6 text-center">
                  <dt class="text-sm font-medium text-gray-500 truncate">
                    {{ item.name }} - USD
                  </dt>
                  <dd class="mt-1 text-3xl font-semibold text-gray-900">
                    {{ item.price }}
                  </dd>
                </div>
                <div class="w-full border-t border-gray-200"></div>
                <button
                    @click.stop="removeTicker(item)"
                    class="flex items-center justify-center font-medium w-full bg-gray-100 px-4 py-4 sm:px-6 text-md text-gray-500 hover:text-gray-600 hover:bg-gray-200 hover:opacity-20 transition-all focus:outline-none"
                >
                  <svg
                      class="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="#718096"
                      aria-hidden="true"
                  >
                    <path
                        fill-rule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clip-rule="evenodd"
                    ></path>
                  </svg>
                  Удалить
                </button>
              </div>
            </dl>
            <hr class="w-full border-t border-gray-600 my-4"/>
          </template>

          <graph-display
              v-if="this.selectedTicker"
              :selected-ticker="selectedTicker"
              :normalized-graph="normalizedGraph"
              @calculate-graph-elements="maxGraphElements = $event"
          />
        </div>
      </div>
    </div>
  </div>
</template>


