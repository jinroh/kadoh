require 'sinatra'
require 'dm-core'
require 'dm-migrations'
require 'json'

configure :development do
  DataMapper.setup(:default, "sqlite3://#{BENCH_DIR}/db/results.dev.db")
  DataMapper::Logger.new(STDOUT, :debug)
end

configure :production do
  DataMapper.setup(:default, "sqlite3://#{BENCH_DIR}/db/results.db")
end

class Result
  include DataMapper::Resource

  property :id,         Serial
  property :type,       String

  property :time,       Integer
  property :reached,    Integer
  property :queries,    Integer
  property :closest,    Integer

  property :dht_size,   Integer
  property :user_agent, String
  property :mobile,     Boolean
  property :cellular,   Boolean

  property :created_at, DateTime

  # TODO: define a proper user agent method
end

DataMapper.auto_upgrade!
