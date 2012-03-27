BENCH_DIR  = Dir.pwd
PUBLIC_DIR = File.expand_path(File.join(BENCH_DIR, 'public'))
KADOH_DIR  = File.expand_path(File.join(BENCH_DIR, '..', '..'))

require './app/models.rb'
require './app/controller.rb'

run Controller.new